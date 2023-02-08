# Deploy

Deploy is an opinionated all-in-one-CLI to publish static websites and serverless functions on the AWS infrastructure. It was created as a combination of our two previous tools [dynamic](https://github.com/designsystemsinternational/clis/tree/master/packages/dynamic) and [static](https://github.com/designsystemsinternational/clis/tree/master/packages/static).

## Getting started

To get started install `deploy` into your project.

```zsh
npm install --save-dev TODO
```

If you wish to go with the default configuration you're ready to go now! You can always come back later and add your custom configuration (see below).

## Deploying

To deploy your project run `deploy`. This is the default command. This will deploy your current environment to AWS. By default the tool is using your current git branch to tell the environment, but you can overwrite this by passing in the `--env` flag (see below).
The deploy command will first check if any changes to your AWS stack are needed (or if it needs to be created in the first place). It will print a list of the needed changes you'll need to confirm before it starts creating your stack and uploading your website.

The command will also prompt you to input any new stack parameters. These are parameters that it cannot find on the existing stack. If you wish to explicitly overwrite existing parameters you can run with the `--update-parameters` flag.

```zsh
deploy
```

You can optionally run the command with a `--env` parameter to ignore the Git branch name and set the environment name directly. This is helpful for e.g. GitHub actions or other CI servers that return `null` for the git branch command.

```zsh
deploy --env production
```

By default the command only prompts you to input new stack parameters. If you wish to be prompted all parameters again run the command with the `--update-parameters` flag. This is useful if you need to update an environment variable.

```zsh
deploy --env production --update-parameters
```

## Configuration

To get you up and running quickly deploy assumes a sensible default config. If at any time you want to reconfigure something you can add your custom config to the `deploy` key of your `package.json` file. Running `deploy init` can help with this.
**HEADS UP** This is likely to change as we plan to move configuration to an external file.

The default configuration looks like this:

```js
{
  // Name of the AWS credentials to use
  profile: 'default',

  // AWS region to deploy to
  region: 'us-east-1',

  // This is automatically created by slugifying the name found in package.json
  name: 'my-repo-name',

  // The build directory of your app
  buildDir: 'dist',

  // If set to true deploy will run your build command before deploying
  shouldRunBuildCommand: true,
  buildCommand: 'npm run build',

  // The directory deploy should look for lambda functions
  functionsDir: 'functions',

  // Lambda function config
  functionsConfig: {
    // Default runtime
    runtime: 'nodejs16.x',

    // Default timeout in seconds
    timeout: 10,

    // Default memory size
    memorySize: 128,

    // npm modules to not include in your lambda function's bundle
    externalModules: [],

    // Environment Variables you want to expose to your functions.
    // These will be turned into prompts when deploying.
    envVariables: []
  },

  // You can additionally keep a config per environment.
  // This can also be set up using `deploy init`
  environments: {
    // The name of your environment
    production: {
      // If set to true no CloudFront Distribution will be created for this
      // environment. This most likely only makes sense for preview deploys
      //
      // PLEASE NOTE: If you do not create a CloudFront distribution you cannot
      // add auth or a custom domain to your stack
      skipCloudfront: false,

      // If set to true the website use HTTP Basic Auth
      // You will be prompted for username and password
      useAuth: false,

      // If set to true a custom domain will be attached 
      // You will be prompted the Domain Name and the ID of 
      // the Route 53 Hosted Zone
      useCustomDomain: true,

      // You can also store any Stack Parameters for this environment
      // in its config. These will not be included in the prompt
      // during deploy. Heads up: These should not be used for
      // sensitive data.
      parameters: {
        // This way we don't get prompted Domain and Route 53 ID
        Domain: "mydomain.com",
        HostedZoneID: "123456",
      },
    }
  }
}
```

## Ejecting Templates

If you want more control over the Stack templates used to create and deploy your website you can eject them. If you do so, you're in control as ejected templates take precedence over deploy's default templates.

```zsh
deploy eject
```

In the eject prompt you can choose if you want to eject the template for the static part of your website or the template for a specific lambda function.

### Static Template

The static template is a function that is called with information on the environment and project's configuration and is expected to return a AWS CloudFormation template as a JS object.

```js
export default function ({
  // Full configuration of the current project
  config,

  // Configuration of the environment deploying to
  environmentConfig,

  // Name of the environment deploying to
  environmentName,

  // Boolean flag to indicate if any custom lambda functions were found in this project
  includesLambdaFunctions,
}) {
```

### Lambda Template

Similarly the lambda template accepts information about the project's configuration and the lambda function and is expected to return a JS object.

```js
export default function ({
  // Full configation of the current project
  config,

  // Information (Name & Route) about the current lambda function
  functionDefinition
}) {
```

## All commands

- `deploy deploy [--env] [--update-parameters]` or just `deploy` – Create (or update) stack and deploy website to it
- `deploy show [--env]` – Gathers stack outputs
- `deploy destroy [--env]` – Deletes current stack
- `deploy eject` – Eject templates
- `deploy init` – Prompts to help you set up a custom deploy configuration

## TODO

There's so much still to do.

- [ ] move to external configuration file (instead of package.json)
- [ ] figure out correct file extension for templates when ejecting (js vs mjs)
- [ ] set up tests for commands
