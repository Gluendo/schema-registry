///usr/bin/env jbang "$0" "$@" ; exit $?
//DEPS io.nats:jnats:2.20.5
//DEPS com.networknt:json-schema-validator:1.5.6
//DEPS com.fasterxml.jackson.core:jackson-databind:2.18.3

/**
 * Employee Event Consumer (Java via JBang)
 *
 * Subscribes to hr.internal.employee.created on NATS JetStream.
 * Validates incoming CloudEvents messages against the schema referenced
 * in the dataschema attribute. Routes invalid messages to DLQ.
 *
 * Run: jbang EmployeeConsumer.java
 */

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.networknt.schema.*;
import io.nats.client.*;
import io.nats.client.api.*;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class EmployeeConsumer {

    static final String NATS_URL = System.getenv().getOrDefault("NATS_URL", "nats://localhost:4222");
    static final String STREAM_NAME = "HR_EVENTS";
    static final String SUBJECT = "hr.internal.employee.created";
    static final String DLQ_SUBJECT = "hr.internal.employee.dlq";
    static final String CONSUMER_NAME = "consumer-java";
    static final String CONSUMER_URN = "urn:gluendo:demo:consumer-java";

    static final ObjectMapper mapper = new ObjectMapper();
    static final Map<String, JsonSchema> schemaCache = new ConcurrentHashMap<>();

    static JsonSchema getSchema(String dataschemaUrl) throws Exception {
        return schemaCache.computeIfAbsent(dataschemaUrl, url -> {
            try {
                System.out.println("  Fetching schema from " + url);
                JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012);
                JsonSchema schema = factory.getSchema(new URI(url));
                System.out.println("  Schema cached: " + url);
                return schema;
            } catch (Exception e) {
                throw new RuntimeException("Failed to fetch schema: " + e.getMessage(), e);
            }
        });
    }

    public static void main(String[] args) throws Exception {
        System.out.println("==> Employee Event Consumer (Java)");
        System.out.println("    Connecting to NATS at " + NATS_URL);
        System.out.println();

        Connection nc = Nats.connect(NATS_URL);
        JetStream js = nc.jetStream();
        JetStreamManagement jsm = nc.jetStreamManagement();

        // Ensure durable consumer exists
        try {
            jsm.getConsumerInfo(STREAM_NAME, CONSUMER_NAME);
        } catch (Exception e) {
            ConsumerConfiguration cc = ConsumerConfiguration.builder()
                    .durable(CONSUMER_NAME)
                    .filterSubject(SUBJECT)
                    .ackPolicy(AckPolicy.Explicit)
                    .build();
            jsm.addOrUpdateConsumer(STREAM_NAME, cc);
        }

        System.out.println("==> Subscribed to " + SUBJECT + " (consumer: " + CONSUMER_NAME + ")");
        System.out.println("    Waiting for messages...\n");

        // Pull-based consumer
        PullSubscribeOptions pso = PullSubscribeOptions.bind(STREAM_NAME, CONSUMER_NAME);
        JetStreamSubscription sub = js.subscribe(SUBJECT, pso);

        while (true) {
            List<Message> messages = sub.fetch(1, Duration.ofSeconds(5));
            for (Message msg : messages) {
                String raw = new String(msg.getData());
                JsonNode event;

                try {
                    event = mapper.readTree(raw);
                } catch (Exception e) {
                    System.out.println("  ERROR: Failed to parse message as JSON");
                    msg.ack();
                    continue;
                }

                String eventId = event.path("id").asText("unknown");
                String type = event.path("type").asText("unknown");
                String source = event.path("source").asText("unknown");
                String dataschemaUrl = event.path("dataschema").asText("");

                System.out.println("--- Received event " + eventId + " ---");
                System.out.println("  Type:   " + type);
                System.out.println("  Source: " + source);
                System.out.println("  Schema: " + dataschemaUrl);

                JsonNode data = event.path("data");

                try {
                    JsonSchema schema = getSchema(dataschemaUrl);
                    Set<ValidationMessage> errors = schema.validate(data);

                    if (errors.isEmpty()) {
                        System.out.println("  Status: VALID");
                        System.out.printf("  Employee: %s — %s %s (%s)%n",
                                data.path("employeeId").asText(),
                                data.path("firstName").asText(),
                                data.path("lastName").asText(),
                                data.path("department").asText());
                    } else {
                        System.out.println("  Status: INVALID — routing to DLQ");
                        List<Map<String, String>> details = new ArrayList<>();
                        for (ValidationMessage err : errors) {
                            System.out.println("    " + err.getInstanceLocation() + ": " + err.getMessage());
                            Map<String, String> detail = new HashMap<>();
                            detail.put("path", err.getInstanceLocation().toString());
                            detail.put("message", err.getMessage());
                            detail.put("schemaRef", dataschemaUrl);
                            details.add(detail);
                        }

                        // Build DLQ envelope
                        ObjectNode dlq = mapper.createObjectNode();
                        dlq.set("originalEvent", event);
                        ObjectNode error = mapper.createObjectNode();
                        error.put("type", "VALIDATION_FAILURE");
                        error.set("details", mapper.valueToTree(details));
                        error.put("consumer", CONSUMER_URN);
                        error.put("timestamp", Instant.now().toString());
                        dlq.set("error", error);

                        js.publish(DLQ_SUBJECT, mapper.writeValueAsBytes(dlq));
                        System.out.println("  Published to " + DLQ_SUBJECT);
                    }
                } catch (Exception e) {
                    System.out.println("  ERROR: " + e.getMessage());
                }

                msg.ack();
                System.out.println();
            }
        }
    }
}
