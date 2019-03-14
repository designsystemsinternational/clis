const AWS = require("aws-sdk");
const execa = require("execa");
const inquirer = require("inquirer");
const { monitorStack, hasEnv, loadConfig, deleteEnv } = require("../utils");

const destroy = async args => {
  if (!args[3]) {
    return console.error("Please state which environment to deploy to");
  }

  const conf = loadConfig();
  const env = args[3];

  if (!hasEnv(conf, env)) {
    console.error("This environment does not exist");
    process.exit();
  }

  const envConfig = conf.environments[env];

  const answers = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `Warning! This will delete all files and resources in the ${
        envConfig.stack
      } stack. Continue?`
    }
  ]);

  if (!answers.confirm) {
    return;
  }

  AWS.config.update({
    region: conf.awsRegion,
    credentials: new AWS.SharedIniFileCredentials({ profile: conf.awsProfile })
  });

  // Delete all files in the bucket
  await execa(
    "aws",
    [
      "s3",
      "rm",
      `s3://${envConfig.bucket}`,
      "--profile",
      conf.awsProfile,
      "--region",
      conf.awsRegion,
      "--recursive"
    ],
    {
      stdout: "inherit"
    }
  );

  // Cloudformation!
  console.log("Deleting AWS Cloudformation stack");
  const cloudformation = new AWS.CloudFormation();
  await cloudformation.deleteStack({ StackName: envConfig.stack }).promise();

  // Listen for changes to cloudformation
  await monitorStack(AWS, envConfig.stack);

  deleteEnv(env);
};

module.exports = destroy;
