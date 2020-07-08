const execa = require("execa");
const ora = require("ora");
const inquirer = require("inquirer");
const {
  loadConfig,
  getEnvironment,
  getEnvironmentConfig,
  saveEnvironmentConfig,
  getAWSWithProfile,
  monitorStack,
  logTable,
  uploadDirToS3,
  paramsToInquirer
} = require("@designsystemsinternational/cli-utils");
const {
  ACTION_NO_CONFIG
} = require("@designsystemsinternational/cli-utils/src/constants");
const s3Template = require("../cloudformation/s3.json");
const cloudfrontTemplate = require("../cloudformation/cloudfront.json");
const authTemplate = require("../cloudformation/auth.json");
const { defaultFileParams } = require("../utils");

// Main
// ---------------------------------------------------------------------

const deploy = async (args = {}) => {
  const { conf, packageJson } = loadConfig("static");
  if (!conf) {
    throw ACTION_NO_CONFIG;
  }
  const env = args && args.env ? args.env : await getEnvironment();
  const envConf = getEnvironmentConfig(conf, env);
  if (!envConf || args.configure) {
    await runCloudFormation(env, conf, packageJson, envConf);
  } else {
    await uploadFiles(env, conf, packageJson, envConf);
  }
};

// Create Stack
// ---------------------------------------------------------------------

const runCloudFormation = async (env, conf, packageJson, envConf) => {
  const AWS = getAWSWithProfile(conf.profile, conf.region);
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "stack",
      message: `Name of the new Cloudformation stack`,
      default: `${packageJson.name}-${env}`,
      when: !envConf || !envConf.stack
    },
    {
      type: "confirm",
      name: "auth",
      message:
        "Enable basic authentication? (requires CloudFront distribution)",
      default: false
    },
    {
      type: "confirm",
      when: a => !a.auth,
      name: "createCloudfront",
      message: "Do you want to set up a Cloudfront distribution?",
      default: true
    }
  ]);

  const stack = answers.stack || envConf.stack;

  // Combine cloudformation templates if needed
  // We perform a somewhat deep copy to not mess up the tests.
  const template = {};
  template.Parameters = Object.assign({}, s3Template.Parameters);
  template.Resources = Object.assign({}, s3Template.Resources);
  template.Outputs = Object.assign({}, s3Template.Outputs);
  if (answers.createCloudfront || answers.auth) {
    Object.assign(template.Parameters, cloudfrontTemplate.Parameters);
    Object.assign(template.Resources, cloudfrontTemplate.Resources);
    Object.assign(template.Outputs, cloudfrontTemplate.Outputs);
    if (answers.auth) {
      Object.assign(template.Parameters, authTemplate.Parameters);
      Object.assign(template.Resources, authTemplate.Resources);
      Object.assign(template.Outputs, authTemplate.Outputs);
      // We don't have any template logic, so I just inject this here.
      template.Resources.CloudfrontDistribution.Properties.DistributionConfig.DefaultCacheBehavior.LambdaFunctionAssociations = [
        {
          EventType: "viewer-request",
          LambdaFunctionARN: { "Fn::GetAtt": ["AuthLambdaRole", "Arn"] }
        }
      ];
    }
  }

  // Dynamic default values for the parameter questions.
  const defaults = {
    S3BucketName: envConf ? envConf.bucket : answers.stack
  };

  // Add questions based on Cloudformation parameters
  const templateAnswers = await inquirer.prompt(
    paramsToInquirer(template.Parameters, defaults)
  );

  const label = envConf ? "Updating stack" : "Creating stack";
  const spinner = ora(label).start();
  const parameters = Object.assign({}, defaults, templateAnswers);

  // Automatic parameters
  template.Parameters["environment"] = {
    Description: "Stack environment based on Git branch",
    Type: "String"
  };
  parameters.environment = env;

  const cloudformation = new AWS.CloudFormation();

  let operation;

  if (!envConf) {
    operation = await cloudformation
      .createStack({
        StackName: stack,
        Parameters: Object.keys(parameters).map(key => ({
          ParameterKey: key,
          ParameterValue: parameters[key].toString()
        })),
        TemplateBody: JSON.stringify(template),
        Capabilities: ["CAPABILITY_NAMED_IAM"]
      })
      .promise();

    const created = await cloudformation
      .waitFor("stackCreateComplete", {
        StackName: stack
      })
      .promise();
  } else {
    operation = await cloudformation
      .updateStack({
        StackName: stack,
        Parameters: Object.keys(parameters).map(key => ({
          ParameterKey: key,
          ParameterValue: parameters[key].toString()
        })),
        TemplateBody: JSON.stringify(template),
        Capabilities: ["CAPABILITY_NAMED_IAM"]
      })
      .promise();

    const updated = await cloudformation
      .waitFor("stackUpdateComplete", {
        StackName: stack
      })
      .promise();
  }

  spinner.succeed();

  spinner.start("Saving environment config");
  saveEnvironmentConfig("static", env, {
    stack,
    bucket: parameters.S3BucketName,
    fileParams: defaultFileParams
  });
  spinner.succeed();

  // Listen for changes to cloudformation
  await monitorStack(AWS, operation.StackId);

  const stacks = await cloudformation
    .describeStacks({ StackName: stack })
    .promise();

  logTable(
    ["Key", "Value", "Description"],
    stacks.Stacks[0].Outputs.map(o => [
      o.OutputKey,
      o.OutputValue,
      o.Description
    ])
  );

  console.log(
    "The resources for the new environment has now been set up. Please run the deploy command again to upload the files. Please make sure to check the environment config in package.json before the first deploy."
  );
};

// Upload Files
// ---------------------------------------------------------------------

const uploadFiles = async (env, conf, packageJson, envConf) => {
  const answers = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `This will deploy the ${env} environment. Continue?`,
      default: `${packageJson.name}-${env}`
    }
  ]);

  if (!answers.confirm) return;

  const spinner = ora("Starting deployment").start();

  if (conf.shouldRunBuildCommand) {
    spinner.text = "Running build command";
    await execa.shell(conf.buildCommand, {
      stdout: "inherit"
    });
    spinner.succeed();
  }

  spinner.start("Uploading files");
  const AWS = getAWSWithProfile(conf.profile, conf.region);
  await uploadDirToS3(AWS, conf.buildDir, envConf.bucket, envConf.fileParams, {
    progress: (cur, total) => {
      if (total > 0) {
        spinner.text = `Uploading files (${Math.round((cur / total) * 100)}%)`;
      }
    }
  });
  spinner.succeed();
};

module.exports = deploy;
