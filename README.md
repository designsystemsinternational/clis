# CLI's by Design Systems International

This is a monorepo with all the command-line tools we use at Design Systems International. They are:

- [scaffold](packages/scaffold) Something
- [static](packages/static) Something
- [dynamic](packages/dynamic) Something

The repo is managed via [lerna](https://github.com/lerna/lerna).

## Development

To get started, clone this repo.

Then run, `lerna bootstrap --hoist`. This will symlink all the dependencies together and run `npm i` inside each package.

If you want to run `npm i` for a single package later, run `lerna bootstrap --hoist --scope dynamic`.

Running `npm i` inside a package folder will not work.

## Test

To run tests of a single package, run `npm run test` from the package folder.

To run all tests, run `lerna run test`.

## Publish

Run `lerna publish`
