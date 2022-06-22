# Changelog

## 4.0.0

- Support for Node 16, 17 and 18

## 3.0.0

- `getEnvironment()` now throws a proper error if the folder is not a Git repo
- `uploadDirToS3()` implements a pure Node version of `aws-cli` S3 `sync` command
- `logTable` logs a table output
- Introducing shared `mock.js` and `expectations.js` files for testing purposes
