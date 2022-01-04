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
	yarn build-release
	chmod +x dist/cli.js

release:
	yarn release
