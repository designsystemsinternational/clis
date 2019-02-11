# DSI Static

This is a simple, opinionated command-line client that takes the pain out of deploying a static site to S3 and Cloudfront. We use this for deploying and managing our React applications.

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

The package allows you to have multiple deployed versions of the same site. To set up infrastructure for a new deployment, you run the `create` command with a name of your new environment:

```
$ dsi-static create production
```

## Uploading the site

## Deleting a site

## Node API

You can use all the functions directly inside Node, however, you have to pass all required params to the functions as it bypasses the config files entirely.
