const pack = require("../../package.json");
const ora = require("ora");
const chalk = require("chalk");
const inquirer = require("inquirer");
const { execSync } = require("child_process");
const {
  getEnvironment,
  getStackName,
  loadConfig,
  getEnvironmentConfig,
  getAWSWithProfile
} = require("@designsystemsinternational/cli-utils");
const { NO_STATIC_CONFIG_OR_ENV_CONFIG } = require("../utils");

const open = async args => {
  const { conf } = loadConfig("static");
  const env = await getEnvironment();
  const envConfig = getEnvironmentConfig(conf, env);

  if (!conf || !envConfig) {
    throw NO_STATIC_CONFIG_OR_ENV_CONFIG;
  }
  const AWS = getAWSWithProfile(conf.profile, conf.region);
  const cloudformation = new AWS.CloudFormation();

  const spinner = ora("Retrieving outputs").start();
  const res = await cloudformation
    .describeStacks({ StackName: envConfig.stackName })
    .promise();
  const stack = res.Stacks[0];
  spinner.succeed();

  // looks for a (case insensitive) partial match
  const match = stack.Outputs.find(o =>
    o.OutputKey.toLowerCase().includes((args.key || "").toLowerCase())
  );

  const chosen =
    match ||
    (await inquirer.prompt([
      {
        type: "list",
        name: "OutputValue",
        message: `Pick a url to open`,
        choices: stack.Outputs.map(o => ({
          name: `${o.OutputKey} (${o.OutputValue})`,
          value: o.OutputValue
        }))
      }
    ]));

  const url = /^https?:\/\//.test(chosen.OutputValue)
    ? chosen.OutputValue
    : `https://${chosen.OutputValue}`;

  console.log(`opening '${url}'...`);
  execSync(`open '${url}'`);
};

open.description = "Open a url from the outputs list.";
module.exports = open;
