# Changelog

## 3.0.0

- The package no longer relies on `aws-cli`. S3 `sync` and emptying of bucket is now done in pure Node.
- We now show an error message if user runs `init` in a repo with a config
- `htmlCache` and `assetsCache` is now replaced with a `fileParams` key that makes it possible to control all metadata for different types of files for S3.
- Show confirm dialog before uploading files on `deploy`
- Show spinner on `deploy` and `destroy`

## 2.1.7

- `static` now uses `yargs` which produces better documentation
- The `deploy` and `destroy` commands can now be used with a `--env somename` to ignore the Git branch and force the environment. Helpful in GitHub actions where `git branch` does not return anything.

## 2.1.6

- You can now run `static` without an AWS profile

## 2.1.5

- `htmlCache` is now also used for `.json` files so deploys work with Gatsby.

## 2.1.2

- Added `static show outputs`

## 2.1.1

- Refactored code to use `@designsystemsinternational/cli-utils`
- Added tests

## 2.0.1

- Fixing labels of US East regions

## 2.0.0

- Config file is now `static.json`
- All commands will now poll the cloudformation stack until action is resolved
- Cloudfront distribution is now optional
- Environment is now deleted in config file after deletion
- Removed ability to use as Node API. Did not make sense.

## 1.1.0

Adding build folder functionality and better defaults.

- Run a build script before deploying
- Default to `dist` build folder
- Default to `index.html` for error page
- Check that config file and environments exist before using them

## 1.0.1

Initial release
