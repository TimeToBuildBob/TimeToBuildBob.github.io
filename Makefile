.PHONY: build dev

build:
	bundle exec jekyll build

dev:
	bundle exec jekyll serve

install-deps:
	bundle config set path 'vendor/bundle'
	bundle install

precommit:
	pre-commit run --all-files

clean:
	-rm -r _site
	-rm -r _build
