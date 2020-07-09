const ora = require("ora");
const {
  getEnvironment,
  loadConfig,
  getEnvironmentConfig,
  getAWSWithProfile,
  logTable
} = require("@designsystemsinternational/cli-utils");

const show = async args => {
  const { conf } = loadConfig("dynamic");
  const env = await getEnvironment();
  const envConfig = getEnvironmentConfig(conf, env);
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
    ["Key", "Value", "Description"],
    stack.Outputs.map(o => [o.OutputKey, o.OutputValue, o.Description])
  );
};

module.exports = show;
