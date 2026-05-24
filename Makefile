.PHONY: build dev install-deps clean og-images jekyll-build-precommit

# Build targets
build: node_modules build-css jekyll-build
	touch _site/.nojekyll

build-css:
	npm run build:css

og-images:
	uv run --with pillow,pyyaml python3 scripts/generate_og_images.py

jekyll-build:
	RUBYOPT="-E utf-8" bundle exec jekyll build

jekyll-build-precommit:
	RUBYOPT="-E utf-8" bundle exec jekyll build --limit_posts 5

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
