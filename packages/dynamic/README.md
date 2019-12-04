# Dynamic

`dynamic` is a CLI written in Node that makes it easier to create and manage Cloudformation applications. It is made for those who like the `serverless` framework, but want something a little closer to the Cloudformation-metal. If you like writing Cloudformation templates, and you build serverless applications with AWS Lambda, this CLI might be something for you.

First, let's consider this simple project structure:

```
package.json
functions/
  cf.js
  myScript.js
```

Here's what `dynamic` does:

- **CF Templates**. All files named `cf.js` inside of the `/functions` folder will be compiled into a single Cloudformation template. These files can return an object with some or all of the three Cloudformation keys (e.g. `{ Parameters: {}, Resources: {}, Outputs: {}}` or `{ Resources: {}}`) or a function returning these same objects. This makes it possible to divide your Cloudformation template into sections and use JavaScript variables and functions to construct the template.

- **Lambdas**. Any file NOT named `cf.js` inside of the `/functions` folder is interpreted as a lambda. All lambdas are packaged with their dependencies via Webpack, uploaded to the chosen S3 folder, and the S3 key is automatically injected into the Cloudformation template. For our project above, `myScript.js` is packaged, zipped, uploaded to S3, and the parameter `myScriptS3Key` is passed to the template. You can use subfolders too, but they are ignored, so filenames have to be unique. Keep in mind that `dynamic` will not automatically create the lambda. You will have to do this in your `cf.js` template files.

- **Environments**. Whenever you run a deploy command, the current Git branch will be used as a name for the environment. This makes it very easy to spin up new environments, since the Cloudformation template will get the environment passed as a parameter called `environment`. The branch `master` is renamed to `production`, but all other branches keep their names.

## Usage

First install with `npm i -g @designsystemsinternational/dynamic`

`cd` into your project folder and run `dynamic init`. Follow the instructions.

Then create a folder called `functions` and add as many `cf.js` and lambda files as you want.

When you are ready to deploy your application, run `dynamic deploy`.

After doing a full deploy, you can deploy a single lambda function by running `dynamic deploy NAME`. In our example from above, this would be `dynamic deploy myScript`.

## Commands

#### `dynamic init`

Asks a few questions needed to run `dynamic` and saves the response to `package.json`.

#### `dynamic deploy`

Create or update the entire stack. This will prompt you about all parameters in the template, and update the template and all the function code.

#### `dynamic deploy functionName`

Creates a Cloudformation changeset with only the update function code.

#### `dynamic show outputs`

Shows the outputs for the current environment.

## Automatic parameters

The following parameters are automatically added to the Cloudformation template and can be used with `{ Ref: "PARAM_NAME" }`.

- `environment`. Name of the current environment, which is named after the current Git branch.
- `operationsS3Bucket`. Name of the bucket chosen for lambda zip files.
- `[function]S3Key`. For every function, the path of the zip file of its code in the operations bucket.

## Why not use X?

- `serverless` is a great framework, but it introduces another layer of abstraction on top of Cloudformation which is not necessarily great when you are used to writing Cloudformation templates. Also, it does not use Cloudformation for function deploys, which defeats the purpose of the stack. It is also written to work on many cloud providers whereas `dynamic` is solely for AWS Cloudformation.
