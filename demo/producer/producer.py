#!/usr/bin/env python3
"""
Employee Created Event Producer

Publishes a CloudEvents message to NATS JetStream.
Validates the data payload against the schema from the catalog before publishing.

Usage:
    python producer.py              # Send a valid employee.created event
    python producer.py --invalid    # Send an invalid event (triggers consumer DLQ)
"""

import asyncio
import json
import os
import random
import sys
import uuid
from datetime import datetime, timezone, timedelta

import nats
import requests

FIRST_NAMES = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hugo", "Iris", "Jack"]
LAST_NAMES = ["Martin", "Dupont", "Smith", "Garcia", "Mueller", "Tanaka", "Singh", "Chen", "Rossi", "Silva"]
DEPARTMENTS = ["Engineering", "Finance", "Marketing", "Sales", "HR", "Legal", "Operations", "Product", "Design", "Data"]
POSITIONS = [
    "Staff Engineer", "Senior Developer", "Product Manager", "Data Analyst",
    "UX Designer", "DevOps Engineer", "QA Lead", "Scrum Master",
    "Solutions Architect", "Technical Writer",
]
STATUSES = ["active", "inactive"]
from jsonschema import validate, ValidationError

# Schema registry catalog URL (bundled, self-contained schema)
SCHEMA_URL = "https://gluendo.github.io/schema-registry/schemas/domains/hr/employee/v1.0.0/employee.schema.json"

# NATS config
NATS_URL = os.environ.get("NATS_URL", "nats://localhost:4222")
STREAM_NAME = "HR_EVENTS"
SUBJECT = "hr.internal.employee.created"


def fetch_schema(url: str) -> dict:
    """Fetch and cache the JSON Schema from the catalog."""
    print(f"  Fetching schema from {url}")
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    schema = resp.json()
    print(f"  Schema loaded: {schema.get('title', 'unknown')} ({schema.get('$id', '')})")
    return schema


def build_valid_event() -> dict:
    """Build a valid CloudEvents employee.created message with randomized data."""
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    dept = random.choice(DEPARTMENTS)
    pos = random.choice(POSITIONS)
    status = random.choice(STATUSES)
    hire_offset = random.randint(1, 365 * 5)
    hire_date = (datetime.now(timezone.utc) - timedelta(days=hire_offset)).strftime("%Y-%m-%d")
    email = f"{first.lower()}.{last.lower()}@example.com"
    emp_id = f"EMP-{uuid.uuid4().hex[:5].upper()}"
    manager_id = f"EMP-{uuid.uuid4().hex[:5].upper()}"

    return {
        "specversion": "1.0",
        "id": str(uuid.uuid4()),
        "source": "urn:gluendo:hr:workday",
        "type": "gluendo.hr.employee.created",
        "time": datetime.now(timezone.utc).isoformat(),
        "datacontenttype": "application/json",
        "traceparent": f"00-{uuid.uuid4().hex}-{uuid.uuid4().hex[:16]}-01",
        "dataschema": SCHEMA_URL,
        "data": {
            "employeeId": emp_id,
            "firstName": first,
            "lastName": last,
            "email": email,
            "department": dept,
            "position": pos,
            "hireDate": hire_date,
            "terminationDate": None,
            "status": status,
            "managerId": manager_id,
        },
    }


def build_invalid_event() -> dict:
    """Build an intentionally invalid CloudEvents message."""
    event = build_valid_event()
    # Break the data: remove required field, add wrong type
    del event["data"]["employeeId"]
    event["data"]["email"] = 12345  # should be string with email format
    event["data"]["status"] = "unknown-status"  # not in enum
    return event


async def ensure_stream(js):
    """Create the JetStream stream if it doesn't exist."""
    try:
        await js.find_stream_name_by_subject(SUBJECT)
        print(f"  Stream {STREAM_NAME} already exists")
    except Exception:
        print(f"  Creating stream {STREAM_NAME}")
        await js.add_stream(
            name=STREAM_NAME,
            subjects=["hr.internal.employee.>"],
            retention="interest",
            storage="file",
            max_msg_size=512_000,
        )


async def main():
    invalid_mode = "--invalid" in sys.argv

    print("==> Employee Created Event Producer")
    print(f"    Mode: {'INVALID (DLQ test)' if invalid_mode else 'VALID'}")
    print()

    # Fetch schema
    print("==> Loading schema from catalog")
    schema = fetch_schema(SCHEMA_URL)
    print()

    # Build event
    if invalid_mode:
        event = build_invalid_event()
        print("==> Built INVALID event (skipping producer-side validation)")
    else:
        event = build_valid_event()
        # Validate before publishing (ADR-010: producer-side validation)
        print("==> Validating data against schema (producer-side)")
        try:
            validate(instance=event["data"], schema=schema)
            print("  Validation passed")
        except ValidationError as e:
            print(f"  VALIDATION FAILED: {e.message}")
            print("  Aborting — invalid data should not be published")
            sys.exit(1)

    print()

    # Connect to NATS and publish
    print(f"==> Connecting to NATS at {NATS_URL}")
    nc = await nats.connect(NATS_URL)
    js = nc.jetstream()

    await ensure_stream(js)

    payload = json.dumps(event, indent=2).encode()
    ack = await js.publish(SUBJECT, payload)
    print(f"  Published to {SUBJECT} (stream: {ack.stream}, seq: {ack.seq})")
    print()
    print(f"  Event ID: {event['id']}")
    print(f"  Employee: {event['data'].get('employeeId', 'MISSING')} "
          f"{event['data'].get('firstName', '')} {event['data'].get('lastName', '')}")
    print()

    await nc.close()
    print("==> Done")


if __name__ == "__main__":
    asyncio.run(main())
