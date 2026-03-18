.PHONY: validate format lint bundle all dev clean

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

# Run all checks
all: validate lint

# Run catalog dev server
dev: bundle
	cd catalog && npm run dev

# Build catalog for production (static export)
build: bundle
	cd catalog && npm run build

# Clean generated files
clean:
	rm -rf dist catalog/.next catalog/out catalog/public/schemas
