/**
 * Employee Event Consumer (TypeScript)
 *
 * Subscribes to hr.internal.employee.created on NATS JetStream.
 * Validates incoming CloudEvents messages against the schema referenced
 * in the dataschema attribute. Routes invalid messages to DLQ.
 */

import { connect, JetStreamClient, JetStreamManager, StringCodec } from "nats";
import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

const NATS_URL = process.env.NATS_URL ?? "localhost:4222";
const STREAM_NAME = "HR_EVENTS";
const SUBJECT = "hr.internal.employee.created";
const DLQ_SUBJECT = "hr.internal.employee.dlq";
const CONSUMER_URN = "urn:gluendo:demo:consumer-ts";

const sc = StringCodec();

// Schema cache: dataschema URL → compiled AJV validator
const schemaCache = new Map<string, ValidateFunction>();

async function getValidator(dataschemaUrl: string): Promise<ValidateFunction> {
  const cached = schemaCache.get(dataschemaUrl);
  if (cached) return cached;

  console.log(`  Fetching schema from ${dataschemaUrl}`);
  const resp = await fetch(dataschemaUrl);
  if (!resp.ok) throw new Error(`Failed to fetch schema: ${resp.status}`);

  const schema = await resp.json();
  // Strip $id and $schema to avoid AJV conflicts
  delete schema["$id"];
  delete schema["$schema"];

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validator = ajv.compile(schema);
  schemaCache.set(dataschemaUrl, validator);

  console.log(`  Schema cached: ${dataschemaUrl}`);
  return validator;
}

interface CloudEvent {
  specversion: string;
  id: string;
  source: string;
  type: string;
  time: string;
  datacontenttype: string;
  dataschema: string;
  traceparent: string;
  data: Record<string, unknown>;
  [key: string]: unknown;
}

async function main() {
  console.log("==> Employee Event Consumer (TypeScript)");
  console.log(`    Connecting to NATS at ${NATS_URL}`);
  console.log();

  const nc = await connect({ servers: NATS_URL });
  const js = nc.jetstream();
  const jsm: JetStreamManager = await nc.jetstreamManager();

  // Ensure durable consumer exists
  const consumerName = "consumer-ts";
  try {
    await jsm.consumers.info(STREAM_NAME, consumerName);
  } catch {
    await jsm.consumers.add(STREAM_NAME, {
      durable_name: consumerName,
      filter_subject: SUBJECT,
      ack_policy: "explicit" as any,
    });
  }

  console.log(`==> Subscribed to ${SUBJECT} (consumer: ${consumerName})`);
  console.log("    Waiting for messages...\n");

  const consumer = await js.consumers.get(STREAM_NAME, consumerName);
  const messages = await consumer.consume();

  for await (const msg of messages) {
    const raw = sc.decode(msg.data);
    let event: CloudEvent;

    try {
      event = JSON.parse(raw);
    } catch (e) {
      console.log(`  ERROR: Failed to parse message as JSON`);
      msg.ack();
      continue;
    }

    console.log(`--- Received event ${event.id} ---`);
    console.log(`  Type:   ${event.type}`);
    console.log(`  Source: ${event.source}`);
    console.log(`  Schema: ${event.dataschema}`);

    // Validate data against schema
    try {
      const validator = await getValidator(event.dataschema);
      const valid = validator(event.data);

      if (valid) {
        console.log(`  Status: VALID`);
        const data = event.data;
        console.log(
          `  Employee: ${data.employeeId} — ${data.firstName} ${data.lastName} (${data.department})`
        );
      } else {
        console.log(`  Status: INVALID — routing to DLQ`);
        const errors = (validator.errors ?? []).map((e) => ({
          path: e.instancePath || "/",
          message: e.message ?? "unknown error",
        }));
        for (const err of errors) {
          console.log(`    ${err.path}: ${err.message}`);
        }

        // Publish to DLQ
        const dlqPayload = {
          originalEvent: event,
          error: {
            type: "VALIDATION_FAILURE",
            details: errors.map((e) => ({
              ...e,
              schemaRef: event.dataschema,
            })),
            consumer: CONSUMER_URN,
            timestamp: new Date().toISOString(),
          },
        };
        await js.publish(DLQ_SUBJECT, sc.encode(JSON.stringify(dlqPayload)));
        console.log(`  Published to ${DLQ_SUBJECT}`);
      }
    } catch (e) {
      console.log(`  ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }

    msg.ack();
    console.log();
  }

  await nc.close();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
