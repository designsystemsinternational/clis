const inquirer = require("inquirer");
const ora = require("ora");
const {
  loadConfig,
  saveConfig,
  awsRegions
} = require("@designsystemsinternational/cli-utils");

const init = async () => {
  const { conf, packageJson } = loadConfig("static");
  const answers = await inquirer.prompt([
    {
      name: "profile",
      type: "input",
      message: "Name of the AWS profile you want to use",
      default: "none"
    },
    {
      name: "region",
      type: "list",
      message: "Name of AWS region for the S3 bucket",
      choices: Object.keys(awsRegions).map(k => ({
        name: awsRegions[k],
        value: k
      }))
    },
    {
      name: "buildDir",
      type: "input",
      message: "Path to your build folder",
      default: "dist"
    },
    {
      name: "shouldRunBuildCommand",
      type: "confirm",
      message: "Do you want to run a build command before deploying?",
      default: true
    },
    {
      name: "buildCommand",
      type: "input",
      when: answers => {
        return answers.shouldRunBuildCommand;
      },
      message: "Build command",
      default: "npm run build"
    }
  ]);

  if (answers.profile === "none" || answers.profile === "") {
    delete answers.profile;
  }

  const spinner = ora("Saving config file").start();
  saveConfig("static", answers);
  spinner.succeed();
};

module.exports = init;
