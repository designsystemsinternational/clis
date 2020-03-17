# Changelog

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
