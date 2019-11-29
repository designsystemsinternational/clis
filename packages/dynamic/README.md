# Dynamic

`dynamic` is a CLI written in Node that makes it easier to create and manage Cloudformation applications. It is made for those who like the `serverless` framework, but want something a little closer to the Cloudformation-metal. It works like this:

- **CF Templates**. Any file named `cf.js` inside of the `/functions` folder will be compiled into a single Cloudformation template. These files can return an object with some or all of the three Cloudformation keys (e.g. `{ Parameters: {}, Resources: {}, Outputs: {}}` or just `{ Resources: {}}`) or a function returning these same objects.

- **Lambdas**. Any file NOT named `cf.js` inside of the `/functions` folder interpreted as a lambda. So `/functions/users/showUser.js` will first be packaged with Webpack, then uploaded to S3, and a parameter named `showUserS3Key` will be injected into the Cloudformation template.

- **Environments**. Whenever you run a deploy command, the current Git branch will be used as a name for the environment. This makes it dead easy to spin up new environment, and builds on the Git flow model.

Think of `dynamic` as a little helper in your pursuit of writing fully-fledged Cloudformation applications.

## Usage

First install with `npm i -g @designsystemsinternational/dynamic`

`cd` into your project folder and run `dynamic init`. Follow the instructions.

Then create a folder called `functions` and add as many `cf.js` and lambda files as you want.

When you are ready to deploy your application, run `dynamic deploy`. If you are on the Git `master` branch, the new environment will be called `production`. Any other branch will keep its name.

After doing a full deploy, you can deploy a single lambda function by running `dynamic deploy NAME`. In our example from before, this would be `dynamic deploy showUser`. Unlike serverless, this also uses Cloudformation changesets for updating the lambda.

## Automatic parameters

The following parameters are automatically added to the Cloudformation template and can be used with `{ Ref: "PARAM_NAME" }`.

- `environment`. Name of the current environment, which is named after the current Git branch.
- `operationsS3Bucket`. Name of the bucket chosen for lambda zip files.
- `[function]S3Key`. For every function, the path of the zip file of its code in the operations bucket.
