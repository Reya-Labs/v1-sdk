install:
	yarn

install-ci:
	yarn --frozen-lockfile

test:
	yarn test

build:
	yarn build

build-release:
	rm -rf dist/
	SENTRY_RELEASE=true yarn build-release

code-quality-check:
	yarn code-quality:check

release:
	yarn release
