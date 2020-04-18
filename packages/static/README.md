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

To upload a site, run the `deploy` command. If this is the first time you are running the command, a new environment will be set up based on your Git branch. Then, it will upload all files in the specified build folder to the environment's S3 bucket. Keep in mind that you will need to wait until the `.html` cache time has expired to see your new site via the Cloudfront distribution.

```
$ static deploy
```

## Commands

- `static init`. Initialize a new project.
- `static deploy`. Deploy a distribution, creating it if needed.
- `static destroy`. Delete all resources and environment config.
- `static show outputs`. Shows the outputs for the current environment.
- `static help`. Shows available commands.
- `static version`. Shows current version of the package.
