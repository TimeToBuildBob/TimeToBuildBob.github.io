.PHONY: build dev install-deps clean

# Build targets
build: node_modules build-css jekyll-build

build-css:
	npm run build:css

jekyll-build:
	bundle exec jekyll build

# Development
dev:
	npm run dev

# Dependencies
node_modules:
	npm install

install-deps:
	bundle config set path 'vendor/bundle'
	bundle install
	npm install

# Cleanup
clean:
	-rm -rf _site
	-rm -rf _build
	-rm -rf node_modules
	-rm -rf assets/css/styles.css
	-rm -rf vendor/bundle

precommit:
	pre-commit run --all-files
