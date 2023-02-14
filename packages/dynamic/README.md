# Dynamic

`dynamic` is a command line tool written in Node.js that makes it easier to create and manage CloudFormation applications. It is made for those who like the `serverless` framework, but want something a little closer to the CloudFormation-metal where you are in control of writing the CloudFormation templates. If you are familiar with CloudFormation and you build serverless applications with AWS Lambda, this CLI might be something for you.

Here's what `dynamic` does:

- **CloudFormation Templates as JS Files**. `dynamic` allows you to write CloudFormation templates in multiple `.js` files and compile them into a single file during deployment. Files matching `functions/**/*.cf.js` will by default be considered CloudFormation files, but this can be changed with the `cloudformationMatch` config setting. These files must return a JavaScript object with at least one of the required CloudFormation template keys (e.g. `{ Parameters: {}, Resources: {}, Outputs: {}}` or `{ Resources: {}}`). This makes it possible to divide longer templates into multiple, and use JavaScript logic to create your template files.

- **Lambdas**. `dynamic` allows you to write lambda functions, compile them into a production build with Webpack, and deploy them via CloudFormation. By default, files in the `functions/` folder not matching `*.cf.js` or `*.test.js` will be considered a lambda, but this can be changed with the `lambdaMatch` config setting. Unlike the `serverless` framework, you will need to write the CloudFormation template to create your lambda, but `dynamic` makes this a lot easier by automatically packaging all lambdas with their dependencies via Webpack, upload them to a chosen S3 folder, and injecting this S3 key into the CloudFormation template.

- **Environments**. `dynamic` has native support for multiple environments, which is decided based on the current Git branch. Want to spin up a new staging environment for your application? Simply run `git checkout -b staging` and `dynamic deploy`. The CloudFormation template will automatically receive the name of the environment via the `environment` parameter. The branch `master` is considered the `production` environment, but all other branches keep their names.

- **Native Deployments**. All `createStack` and `updateStack` commands are automatically handled by running `dynamic deploy`. This makes it easy to redeploy the entire application (`dynamic deploy`) or a single function (`dynamic deploy myFunction`). All updates a made via CloudFormation change sets.

- **Generators**. `dynamic` makes it easy to get started with a new project. Simply run `dynamic generate route` to generate the files needed to deploy a single lambda attached to a AWS API HTTP Gateway.

## Project Example

First, let's consider this simple project structure:

```
package.json
functions/
  myScript.cf.js
  myScript.js
```

When you run `dynamic deploy`, the `myScript.js` file is packaged, zipped, uploaded to S3, and the parameter `myScriptS3Key` is passed to the template created by reading the `myScript.cf.js` file.

Consider a more complicated project structure:

```
package.json
functions/
  cf.js
  indexUsers.cf.js
  indexUsers.js
  showUser.cf.js
  showUser.js
```

When you run `dynamic deploy`, the `indexUsers.js` and `showUser.js` files are packaged, zipped, uploaded to S3, and the parameters `indexUsersS3Key` and `showUserS3Key` is passed to the CloudFormation template. This template is created by combining all the `*cf.js` files, which allows you to have the CloudFormation template for each route in a separate file. You can use subfolders too, but they are ignored, so filenames have to be unique.

## Usage

First install with `npm i -g @designsystemsinternational/dynamic`

`cd` into your project folder and run `dynamic init`. Follow the instructions.

Then rune `dynamic generate route`. follow the instructions.

When you are ready to deploy your application, run `dynamic deploy`.

After doing a full deploy, you can deploy a single lambda function by running `dynamic deploy NAME`. In the simple project example from above, this would be `dynamic deploy myScript`.

## Commands

- `dynamic init`. Asks a few questions needed to run `dynamic` and saves the response to `package.json`.
- `dynamic deploy`. Create or update the entire stack. This will prompt you about all parameters in the template, and update the template and all the function code.
- `dynamic deploy functionName`. Creates a CloudFormation changeset with only the update function code.
- `dynamic generate route`. Create the files needed for a single API route.
- `dynamic show`. Shows the outputs for the current environment.

## Config file settings

The `dynamic` config is defined in a `dynamic` key inside the `package.json`. The following settings apply:

- `cloudformationMatch`. The glob patterns used to detect cloudformation files. Uses [`micromatch`](https://github.com/micromatch/micromatch) and defaults to `["functions/**/cf.js"]`.
- `lambdaMatch`. The glob patterns used to detect lambda files. Uses [`micromatch`](https://github.com/micromatch/micromatch) and defaults to `["functions/**/*.js", "!functions/**/cf.js"]`.
- `buildDir`. Directory where the lambda build files go. Defaults to `build`.
- `externalPackages`. Optional array of NPM packages used in your functions that you don't want to bundle with your lambda code. This is mostly used for libraries that include a binary (like Puppeteer). Packages relying on binaries are easier to set up using a shared [Lambda Layer](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html).

## Automatic parameters

The following parameters are automatically added to the CloudFormation template and can be used with `{ Ref: "PARAM_NAME" }`.

- `environment`. Name of the current environment, which is named after the current Git branch.
- `operationsS3Bucket`. Name of the bucket chosen for lambda zip files.
- `[function]S3Key`. For every function, the path of the zip file of its code in the operations bucket.

## Why not use X?

- `serverless` is a great framework, but it introduces another layer of abstraction on top of CloudFormation which is not necessarily great when you are used to writing CloudFormation templates. Also, it does not use CloudFormation for function deploys, which defeats the purpose of the stack. It is also written to work on many cloud providers whereas `dynamic` is solely for AWS CloudFormation.
