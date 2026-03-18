.PHONY: up down build produce produce-invalid consumers consume-ts consume-java

# Start NATS with JetStream
up:
	docker compose up -d nats
	@echo "==> NATS started. Stream will be created by the producer."

# Stop everything and clean up
down:
	docker compose --profile produce --profile produce-invalid --profile consumers down -v

# Build all images
build:
	docker compose --profile produce --profile consumers build

# Produce a valid employee.created event
produce:
	docker compose --profile produce run --rm producer

# Produce an invalid event (triggers consumer DLQ)
produce-invalid:
	docker compose --profile produce-invalid run --rm producer-invalid

# Start both consumers
consumers:
	docker compose --profile consumers up consumer-ts consumer-java

# Start TypeScript consumer only
consume-ts:
	docker compose --profile consumers up consumer-ts

# Start Java consumer only
consume-java:
	docker compose --profile consumers up consumer-java
