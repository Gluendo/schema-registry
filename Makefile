.PHONY: validate format lint bundle compat examples all dev build clean

# Schema validation and formatting
validate:
	python3 tools/schema-tools.py all

format:
	python3 tools/schema-tools.py format

# Bundle schemas (inline $ref)
bundle:
	python3 tools/schema-tools.py bundle schemas dist

# Lint bundled schemas with Vacuum
lint: bundle
	./tools/lint.sh dist

# Check backward compatibility between versions
compat:
	python3 tools/schema-tools.py compat schemas

# Validate example CloudEvents payloads
examples:
	python3 tools/schema-tools.py examples schemas

# Run all checks
all: validate examples lint

# Run catalog dev server
dev: bundle
	cd catalog && npm run dev

# Build catalog for production (static export)
build: bundle
	cd catalog && npm run build

# Demo (NATS + producer/consumers)
demo-up:
	$(MAKE) -C demo up

demo-down:
	$(MAKE) -C demo down

demo-setup:
	$(MAKE) -C demo setup

demo-produce:
	$(MAKE) -C demo produce

demo-produce-invalid:
	$(MAKE) -C demo produce-invalid

# Clean generated files
clean:
	rm -rf dist catalog/.next catalog/out catalog/public/schemas
