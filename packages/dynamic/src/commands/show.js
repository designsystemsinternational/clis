const ora = require("ora");
const Table = require("cli-table3");
const {
  getEnvironment,
  getStackName,
  loadConfig,
  getAWSWithProfile
} = require("../utils");

const show = async args => {
  const { name, conf } = loadConfig();
  const environment = await getEnvironment();

  if (!conf || !conf.environments || !conf.environments[environment]) {
    console.error(chalk.red(`Environment does not exist: ${environment}`));
  }

  const stackName = getStackName(name, conf, environment);

  if (args[3] === "outputs") {
    await showOutputs(conf, environment, stackName);
  } else {
    console.error(chalk.red(`Wrong command`));
  }
};

const showOutputs = async (conf, environment, stackName) => {
  const AWS = getAWSWithProfile(conf.profile, conf.region);
  const cloudformation = new AWS.CloudFormation();

  const spinner = ora("Retrieving resources").start();
  const res = await cloudformation
    .describeStacks({ StackName: stackName })
    .promise();
  const stack = res.Stacks[0];
  spinner.succeed();

  const table = new Table({
    head: ["Key", "Value", "Description"]
  });

  stack.Outputs.forEach(o =>
    table.push([o.OutputKey, o.OutputValue, o.Description])
  );

  console.log(table.toString());
};

module.exports = show;
