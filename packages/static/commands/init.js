const inquirer = require("inquirer");
const { hasConfig, saveConfig } = require("../utils");

const init = async () => {
  if (hasConfig()) {
    console.error("This folder already has a static config file");
    return process.exit();
  }

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "awsProfile",
      message: "Name of the AWS profile you want to use",
      default: "default"
    },
    {
      type: "list",
      name: "awsRegion",
      message: "Name of AWS region for the S3 bucket",
      default: "us-east-1",
      choices: [
        { name: "us-east-1 (Ohio)", value: "us-east-1" },
        { name: "us-east-2 (N. Virginia)", value: "us-east-2" },
        { name: "us-west-1 (N. California)", value: "us-west-1" },
        { name: "us-west-2 (Oregon)", value: "us-west-2" },
        { name: "ap-south-1 (Mumbai)", value: "ap-south-1" },
        { name: "ap-northeast-1 (Tokyo)", value: "ap-northeast-1" },
        { name: "ap-northeast-2 (Seoul)", value: "ap-northeast-2" },
        { name: "ap-northeast-3 (Osaka)", value: "ap-northeast-3" },
        { name: "ap-southeast-1 (Singapore)", value: "ap-southeast-1" },
        { name: "ap-southeast-2 (Sydney)", value: "ap-southeast-2" },
        { name: "ca-central-1 (Canada)", value: "ca-central-1" },
        { name: "cn-north-1 (Beijing)", value: "cn-north-1" },
        { name: "cn-northwest-1 (Ningxia)", value: "cn-northwest-1" },
        { name: "eu-central-1 (Frankfurt)", value: "eu-central-1" },
        { name: "eu-west-1 (Ireland)", value: "eu-west-1" },
        { name: "eu-west-2 (London)", value: "eu-west-2" },
        { name: "eu-west-3 (Paris)", value: "eu-west-3" },
        { name: "eu-north-1 (Stockholm)", value: "eu-north-1" },
        { name: "sa-east-1 (São Paulo)", value: "sa-east-1" }
      ]
    },
    {
      type: "input",
      name: "websiteName",
      message: "Name of the website. (a-z,0-9,-)"
    },
    {
      type: "input",
      name: "buildFolder",
      message: "Path to your build folder",
      default: "dist"
    },
    {
      type: "confirm",
      name: "shouldRunBuildCommand",
      message: "Do you want to run a build command before deploying?",
      default: true
    },
    {
      type: "input",
      name: "buildCommand",
      when: answers => {
        return answers.shouldRunBuildCommand;
      },
      message: "Build command",
      default: "npm run build"
    }
  ]);

  saveConfig(answers);
  console.log("Config file saved! Now go ahead and create an environment");
};

module.exports = init;
