# Static

This is a simple, opinionated command-line client that takes the pain out of deploying a static website to S3 and Cloudfront via Cloudformation. We use this at [Design Systems International](https://designsystems.international/) for deploying and managing our React applications.

Features:

- **Manage AWS resources**. The tool will create an S3 bucket and CloudFront distribution with healthy defaults such a CORS and HTTPS to serve your static website.
- **Multiple environments**. Deploy different versions of your website. This allows you to e.g. have a `staging` and `production` environment for the same website.
- **Project settings**. Easily customize the build folder and cache time for your website files.

The tool works with the [AWS command line client](https://aws.amazon.com/cli/), so make sure that it is installed and that you have [configured it](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) with at least a default profile. It will create a `static.json` file in your repository with information about the AWS profile and region to use. This file does not have any AWS access keys and should be checked into your code repository.

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

Each project needs to have at least one environment. An environment is a set of resources controlled via an AWS CloudFormation stack, and multiple environments allow you to deploy separate versions of the same site. To set up a new environment, run the `create` command. This will create a CloudFormation stack with the aforementioned resources needed to host your website.

```
$ static create production
```

## Deploying

To upload a site to a specific environment, run the `deploy` command with the name of an environment. This will upload all files in the specified build folder to the environment S3 bucket. Keep in mind that you will need to wait until the `.html` cache time has expired to see your new site via the Cloudfront distribution.

```
$ static deploy production
```

## Destroying

You can delete the resources for a site by calling the `destroy` command with the name of an environment. This will delete all files in the environment S3 bucket as well as the resources and CloudFormation stack.

```
$ static destroy production
```
