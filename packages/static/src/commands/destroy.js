const AWS = require("aws-sdk");
const execa = require("execa");
const ora = require("ora");
const inquirer = require("inquirer");
const {
  loadConfig,
  getEnvironment,
  getEnvironmentConfig,
  getAWSWithProfile,
  monitorStack,
  deleteEnvironmentConfig,
  emptyS3Bucket,
} = require("@designsystemsinternational/cli-utils");
const {
  ACTION_NO_CONFIG,
  ACTION_NO_ENV,
} = require("@designsystemsinternational/cli-utils/src/constants");

const destroy = async (args) => {
  const { conf, packageJson } = loadConfig("static");
  const env = args && args.env ? args.env : await getEnvironment();
  const envConfig = getEnvironmentConfig(conf, env);

  if (!conf) {
    throw ACTION_NO_ENV;
  }

  if (!envConfig) {
    throw ACTION_NO_ENV;
  }

  const AWS = getAWSWithProfile(conf.profile, conf.region);

  const answers = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `Warning! This will delete all files and resources in the ${envConfig.stack} stack. Continue?`,
    },
  ]);

  if (!answers.confirm) {
    return;
  }

  // Delete all files in the bucket
  const spinner = ora("Deleting files in S3 bucket").start();
  await emptyS3Bucket(AWS, envConfig.bucket);
  spinner.succeed();

  // Cloudformation!
  spinner.start("Running deleteStack on CloudFormation");
  const cloudformation = new AWS.CloudFormation();
  await cloudformation.deleteStack({ StackName: envConfig.stack }).promise();
  spinner.succeed();

  // Listen for changes to cloudformation
  await monitorStack(AWS, envConfig.stack);

  spinner.start("Deleting environment config");
  deleteEnvironmentConfig("static", env);
  spinner.succeed();
};

module.exports = destroy;
