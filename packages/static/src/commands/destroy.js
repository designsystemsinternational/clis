const AWS = require("aws-sdk");
const execa = require("execa");
const inquirer = require("inquirer");
const {
  loadConfig,
  getEnvironment,
  getEnvironmentConfig,
  getAWSWithProfile,
  monitorStack,
  deleteEnvironmentConfig,
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
  await execa(
    "aws",
    [
      "s3",
      "rm",
      `s3://${envConfig.bucket}`,
      "--profile",
      conf.profile,
      "--region",
      conf.region,
      "--recursive",
    ],
    {
      stdout: "inherit",
    }
  );

  // Cloudformation!
  const cloudformation = new AWS.CloudFormation();
  await cloudformation.deleteStack({ StackName: envConfig.stack }).promise();

  // Listen for changes to cloudformation
  await monitorStack(AWS, envConfig.stack);

  deleteEnvironmentConfig("static", env);

  console.log("Done!");
};

module.exports = destroy;
