# Command line tools by Design Systems International

This is a monorepo with all the command-line tools we use at Design Systems International. They are:

- [scaffold](packages/scaffold) A tool to generate a sensible React project scaffold.
- [static](packages/static) A tool to deploy a static website to S3 and CloudFront via CloudFormation.
- [dynamic](packages/dynamic) A tool to deploy dynamic applications to AWS via CloudFormation.

The repo is managed via [lerna](https://github.com/lerna/lerna).

## Development

To get started, clone this repo.

Then run, `npm run bootstrap`. This will symlink all the dependencies together and run `npm i` inside each package. Running `npm i` inside a package folder will not work.

## Test

To run all tests, run `npm run test` from the root folder.

To run tests for a single pacakge, run `npm run test` from the package folder.

To run only a single test file, run `npm run test -t 'my.test.js'`.

## Publish

Run `lerna publish`
