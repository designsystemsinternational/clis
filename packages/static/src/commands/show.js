const pack = require("../../package.json");
const ora = require("ora");
const chalk = require("chalk");
const {
  getEnvironment,
  getStackName,
  loadConfig,
  getEnvironmentConfig,
  getAWSWithProfile,
  logTable
} = require("@designsystemsinternational/cli-utils");
const {
  ACTION_NO_CONFIG,
  ACTION_NO_ENV
} = require("@designsystemsinternational/cli-utils/src/constants");

const show = async args => {
  const { conf } = loadConfig("static");
  const env = await getEnvironment();
  const envConfig = getEnvironmentConfig(conf, env);

  if (!conf) {
    throw ACTION_NO_ENV;
  }

  if (!envConfig) {
    throw ACTION_NO_ENV;
  }

  await showOutputs(conf, env, envConfig);
};

const showOutputs = async (conf, env, envConfig) => {
  const AWS = getAWSWithProfile(conf.profile, conf.region);
  const cloudformation = new AWS.CloudFormation();

  const spinner = ora("Retrieving outputs").start();
  const res = await cloudformation
    .describeStacks({ StackName: envConfig.stack })
    .promise();
  const stack = res.Stacks[0];
  spinner.succeed();

  logTable(
    ["Type", "URL"],
    stack.Outputs.map(o => [
      o.OutputKey,
      chalk.bold(o.OutputValue) + "\n" + o.Description
    ])
  );
};

module.exports = show;
