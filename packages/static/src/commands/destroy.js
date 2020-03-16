const AWS = require("aws-sdk");
const execa = require("execa");
const inquirer = require("inquirer");
const {
  loadConfig,
  getEnvironment,
  getEnvironmentConfig,
  getAWSWithProfile,
  monitorStack,
  deleteEnvironmentConfig
} = require("@designsystemsinternational/cli-utils");
const { NO_STATIC_CONFIG_OR_ENV_CONFIG } = require("../utils");

const destroy = async args => {
  const { conf, packageJson } = loadConfig("static");
  const env = await getEnvironment();
  const envConf = getEnvironmentConfig(conf, env);
  if (!conf || !envConf) {
    throw NO_STATIC_CONFIG_OR_ENV_CONFIG;
  }

  const AWS = getAWSWithProfile(conf.profile, conf.region);

  const answers = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `Warning! This will delete all files and resources in the ${
        envConf.stack
      } stack. Continue?`
    }
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
      `s3://${envConf.bucket}`,
      "--profile",
      conf.profile,
      "--region",
      conf.region,
      "--recursive"
    ],
    {
      stdout: "inherit"
    }
  );

  // Cloudformation!
  const cloudformation = new AWS.CloudFormation();
  await cloudformation.deleteStack({ StackName: envConf.stack }).promise();

  // Listen for changes to cloudformation
  await monitorStack(AWS, envConf.stack);

  deleteEnvironmentConfig("static", env);

  console.log("Done!");
};

module.exports = destroy;
