# Static

This is a simple, opinionated command-line client that takes the pain out of deploying a static website to S3 and Cloudfront via Cloudformation. We use this at [Design Systems International](https://designsystems.international/) for deploying and managing our React applications.

Features:

- **Manage AWS resources**. The tool will create an S3 bucket and CloudFront distribution with healthy defaults such a CORS and HTTPS to serve your static website.
- **Multiple environments**. Deploy different versions of your website based on your Git branches. This allows you to e.g. have a `staging` and `production` environment for the same website.
- **Project settings**. Easily customize the build folder and cache time for your website files.

The tool works with the [AWS command line client](https://aws.amazon.com/cli/), so make sure that it is installed and that you have [configured it](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) with at least a default profile. It will create a `static` key in your repository's `package.json` with information about the AWS profile and region to use.

## Setup

Make sure to globally install the command line tool.

```
$ npm install -g @designsystemsinternational/static
```

You need to run the `init` command once inside your project folder to create a config file.

```
$ cd myproject
$ static init
```

## Deploying

To upload a site, run the `deploy` command. If this is the first time you are running the command, a new environment will be set up based on your Git branch. Then, it will upload all files in the specified build folder to the environment's S3 bucket.

```
$ static deploy
```

You can optionally run the command with a `--env` parameter to ignore the Git branch name and set the environment name directly. This is helpful for e.g. GitHub actions or other CI servers that return `null` for the `git branch` command.

```
$ static deploy --env somename
```

## Configuration file

The static configuration file resides inside `package.json` and will automatically be created when running `static init` and updated after creating an environment with `static deploy`. It has the following keys, many of whom will be pre-populated by `static` when running `init` or `deploy`.

- `profile` - Name of the AWS profile in the AWS credentials file to use
- `region` - Region where the CloudFormation stacks will be created
- `buildDir` - Name of the folder where the build files of the website are located
- `shouldRunBuildCommand` - A boolean indicating whether `static` should run a build command during `static deploy`
- `buildCommand` - The command to run to generate the website files
- `environments` - An object with environment-specific settings
  - `stack` - Name of the CloudFormation stack to use for this environment
  - `bucket` - Name of the S3 bucket to use for this environment
  - `fileParams` - An array of objects that defines extra metadata for the uploaded files. This can be used to control the cache, content type, or any other parameter allowed by S3. See below.

## File params

When deploying the website, the `fileParams` setting can be used to control certain S3 metadata for the files in this environment. The default `fileParams` array makes sure that `.html` and `.json` files have a faster cache expiration than other files (which are expected to be fingerprinted).

```json
{
  "static": {
    "environments": {
      "production": {
        "fileParams": [
          {
            "match": ["**/*.(html|json)"],
            "params": {
              "CacheControl": "public, max-age=300"
            }
          },
          {
            "match": ["!**/*.(html|json)"],
            "params": {
              "CacheControl": "public, max-age=31536000, immutable"
            }
          }
        ]
      }
    }
  }
}
```

Every file will be matched against the `.match` attribute, and the first item in the array that matches will add its `.params` to the S3 `putObject` call when uploading the file.

## Commands

- `static init`. Initialize a new project.
- `static deploy`. Deploy a distribution, creating it if needed.
- `static destroy`. Delete all resources and environment config.
- `static show outputs`. Shows the outputs for the current environment.
- `static --help`. Shows available commands and other documentation.
