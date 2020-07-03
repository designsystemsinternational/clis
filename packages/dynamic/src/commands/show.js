const ora = require("ora");
const Table = require("cli-table3");
const {
  getEnvironment,
  getStackName,
  loadConfig,
  getEnvironmentConfig,
  getAWSWithProfile,
} = require("@designsystemsinternational/cli-utils");

const show = async (args) => {
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
    .describeStacks({ StackName: envConfig.stackName })
    .promise();
  const stack = res.Stacks[0];
  spinner.succeed();

  const table = new Table({
    head: ["Key", "Value", "Description"],
  });

  stack.Outputs.forEach((o) =>
    table.push([o.OutputKey, o.OutputValue, o.Description])
  );

  console.log(table.toString());
};

module.exports = show;
