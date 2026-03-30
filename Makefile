.PHONY: validate format lint bundle compat examples all dev build preview clean ec-generate ec-dev ec-build hooks

# Install git hooks
hooks:
	git config core.hooksPath .githooks
	@echo "Git hooks installed (.githooks/pre-commit)"

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

# Build catalog for production (static export) with EventCatalog
build: bundle ec-generate
	cd catalog && npm run build
	cd eventcatalog && npx eventcatalog build
	cp -r eventcatalog/dist catalog/out/eventcatalog

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

# EventCatalog (generate from schemas, then dev/build)
ec-generate:
	node eventcatalog/generate.mjs

ec-dev: ec-generate
	cd eventcatalog && npm run dev

ec-build: ec-generate
	cd eventcatalog && npm run build

# Serve production build locally (mimics GitHub Pages)
preview: build
	@mkdir -p /tmp/schema-registry-preview/schema-registry
	@cp -r catalog/out/* /tmp/schema-registry-preview/schema-registry/
	@echo "Serving at http://localhost:4000/schema-registry/"
	@npx http-server /tmp/schema-registry-preview -p 4000 -c-1

# Clean generated files
clean:
	rm -rf dist catalog/.next catalog/out catalog/public/schemas eventcatalog/domains eventcatalog/services eventcatalog/dist
