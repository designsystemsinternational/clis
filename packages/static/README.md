# DSI Static

This is a simple, opinionated command-line client that takes the pain out of deploying a static site to S3 and Cloudfront via Cloudformation. We use this at [Design Systems International](https://designsystems.international/) for deploying and managing our React applications.

## First time install

To use this package, you must have installed the [AWS command line client](https://aws.amazon.com/cli/) and [configured it](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) with at least a default profile. The package also supports profiles.

Then, install this package globally.

```
$ npm install -g dsi-static
```

## Setting up a new project

From inside your project folder, run the following command:

```
$ dsi-static init
```

This will save a `.staticconfig` file in your project folder so you do not need to retype the same info over and over again. This file does not hold any access keys and should be checked into your code repository.

## Creating a site

The package allows you to have multiple deployed versions of the same site. To set up infrastructure for a new deployment, you run the `create` command with a name of your new environment.

```
$ dsi-static create production
```

## Deploying a site

To upload a site to a specific environment, run the following command.

```
$ dsi-static deploy production
```

Keep in mind that you will need to wait until the `.html` cache time has expired to see your new site via the Cloudfront distribution.

## Deleting a site

You can delete the resources for a site by calling the `destroy` command:

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
