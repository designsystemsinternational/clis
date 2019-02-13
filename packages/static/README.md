# DSI Static

This is a simple, opinionated command-line client that takes the pain out of deploying a static website to S3 and Cloudfront via Cloudformation. We use this at [Design Systems International](https://designsystems.international/) for deploying and managing our React applications.

The tool works with the [AWS command line client](https://aws.amazon.com/cli/), so make sure that it is installed and that you have [configured it](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) with at least a default profile.

The tool works by saving a `.staticconfig` file in your repository with information about the AWS profile and region to use. This file will also hold information about every environment that you create with the `create` command. This file does not have any AWS access keys and should be checked into your code repository.

## Install

Make sure to globally install the command line tool.

```
$ npm install -g dsi-static
```

## Project setup

First, you need to create a config file. You only need to do this once per project. This will save a `.staticconfig` file in your project folder.

```
$ dsi-static init
```

Each project needs to have at least one environment. An environment is a set of resources controlled via an AWS CloudFormation stack, and multiple environments allow you to deploy separate versions of the same site. To set up a new environment, run the `create` command. This will create a CloudFormation stack with the resources needed to host your website.

```
$ dsi-static create production
```

## Deploying

To upload a site to a specific environment, run the `deploy` command with the name of an environment. This will upload all files in the specified build folder to the environment S3 bucket. Keep in mind that you will need to wait until the `.html` cache time has expired to see your new site via the Cloudfront distribution.

```
$ dsi-static deploy production
```

## Destroying

You can delete the resources for a site by calling the `destroy` command with the name of an environment. This will delete all files in the environment S3 bucket as well as the resources and CloudFormation stack.

```
$ dsi-static destroy production
```

## Node API

You can use all the functions directly in Node without the config file setup. All functions are in the `commands` folder and can be imported and used like this:

```js
const { create } = require("dsi-static");

await create(
  "aws-profile-name",
  "aws-region",
  "my-site-staging",
  stackTemplateParameters
);
```
