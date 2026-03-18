# Getting Started for Consumers

This guide explains how to discover, fetch, and validate against schemas as a consumer of events on the integration platform.

## 1. Discover schemas

### Browse the catalog

Visit the [Schema Catalog](https://gluendo.github.io/schema-registry/) to browse by domain, search by name or field, and view field documentation.

### Find the schema URL

Every schema page shows a **Schema URL** box with a copyable URL:

```
https://gluendo.github.io/schema-registry/schemas/domains/hr/employee/v1.0.0/employee.schema.json
```

This URL is the same one used in the CloudEvents `dataschema` attribute.

## 2. Fetch a schema

### From a CloudEvents message

Every message on the platform includes a `dataschema` attribute pointing to the schema that describes its `data` field:

```json
{
  "specversion": "1.0",
  "type": "gluendo.hr.employee.created",
  "dataschema": "https://gluendo.github.io/schema-registry/schemas/domains/hr/employee/v1.0.0/employee.schema.json",
  "data": { ... }
}
```

Fetch the schema from that URL and cache it — schemas at a given URL are immutable.

### Directly

```bash
curl https://gluendo.github.io/schema-registry/schemas/domains/hr/employee/v1.0.0/employee.schema.json
```

## 3. Validate messages

### TypeScript / JavaScript

```typescript
import Ajv from "ajv";
import addFormats from "ajv-formats";

// Fetch and cache the schema (do this once at startup)
const res = await fetch(event.dataschema);
const schema = await res.json();

// Validate
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

if (validate(event.data)) {
  // Process the event
} else {
  // Route to dead-letter with validation errors
  console.error(validate.errors);
}
```

### Python

```python
import json
import requests
from jsonschema import validate, ValidationError

# Fetch and cache the schema
schema = requests.get(event["dataschema"]).json()

try:
    validate(instance=event["data"], schema=schema)
    # Process the event
except ValidationError as e:
    # Route to dead-letter
    print(f"Validation failed: {e.message}")
```

### Java

```java
import com.networknt.schema.*;

// Fetch and cache the schema
JsonSchema schema = JsonSchemaFactory
    .getInstance(SpecVersion.VersionFlag.V202012)
    .getSchema(new URI(event.getDataschema()));

Set<ValidationMessage> errors = schema.validate(event.getData());
if (errors.isEmpty()) {
    // Process the event
} else {
    // Route to dead-letter
    errors.forEach(e -> log.error("Validation: {}", e.getMessage()));
}
```

## 4. Handle schema evolution

### Unknown fields

Your consumer **must tolerate unknown fields**. When a producer adds a new optional field in a minor version, your consumer should ignore fields it doesn't recognize — never reject the message.

### Unknown enum values

When a producer adds a new enum value (e.g., a new `status`), your consumer should handle it gracefully: log a warning, use a default, or skip processing — never crash.

### Version changes

- **Minor version** (v1.0.0 → v1.1.0): backward-compatible. Your consumer continues to work without changes.
- **Major version** (v1 → v2): breaking change. You will need to update your consumer. The producer communicates the migration timeline.

### Caching strategy

Schemas at a given URL are **immutable** — they never change. Cache aggressively:

| Strategy | When to use |
|----------|-------------|
| **Startup preload** | Load all schemas your consumer needs at application startup |
| **Lazy fetch + cache** | Fetch on first encounter of a new `dataschema` URL, cache forever |
| **Vendored** | Bundle schemas into your deployment artifact for maximum resilience |

## 5. Dead-letter handling

If a message fails validation, route it to a dead-letter channel with structured metadata:

```json
{
  "originalEvent": { },
  "error": {
    "type": "VALIDATION_FAILURE",
    "details": [
      {
        "path": "$.data.amount",
        "message": "expected type number, got string"
      }
    ],
    "consumer": "urn:gluendo:system:finance:sap-connector",
    "timestamp": "2026-03-18T10:30:00Z"
  }
}
```

Monitor your dead-letter channel — a spike in validation errors likely indicates a producer bug or a schema version mismatch.

## 6. Subscribe to changes

Use the [RSS feed](https://gluendo.github.io/schema-registry/feed.xml) to be notified when new schema versions are published.
