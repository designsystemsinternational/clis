const ora = require("ora");
const Table = require("cli-table3");
const chalk = require("chalk");
const {
  getEnvironment,
  getStackName,
  loadConfig,
  getEnvironmentConfig,
  getAWSWithProfile
} = require("@designsystemsinternational/cli-utils");
const { NO_STATIC_CONFIG_OR_ENV_CONFIG } = require("../utils");

const show = async args => {
  const { conf } = loadConfig("static");
  const env = await getEnvironment();
  const envConfig = getEnvironmentConfig(conf, env);

  if (!conf || !envConfig) {
    throw NO_STATIC_CONFIG_OR_ENV_CONFIG;
  }

  const commands = ["outputs"];

  if (args[3] === "outputs") {
    await showOutputs(conf, env, envConfig);
  } else {
    console.error(
      chalk.red(`Wrong command`),
      "\nAvailable commands: ",
      chalk.bold("\nshow " + commands.join("\nshow "))
    );
  }
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
    head: ["Type", "URL"]
  });

  stack.Outputs.forEach(o =>
    table.push([o.OutputKey, chalk.bold(o.OutputValue) + "\n" + o.Description])
  );
  console.log(table.toString());
};

show.description =
  "Shows available information. \n'show outputs' lists exsiting distribution urls";
module.exports = show;
