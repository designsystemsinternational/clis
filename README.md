# CLI's by Design Systems International

This monorepo is managed via [lerna](https://github.com/lerna/lerna) in order to share utility functions between our different command-line repos.

## Development

Instead of doing `npm install`, run `lerna bootstrap --hoist`.

## Test

To run tests of a single package, run `npm run test` from the package folder.

To run all tests, run `lerna run test`.

## Publish

Run `lerna publish`
