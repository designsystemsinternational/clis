#!/usr/bin/env node

const chalk = require("chalk");
const init = require("./commands/init");
const deploy = require("./commands/deploy");
const show = require("./commands/show");
const generate = require("./commands/generate");

const env = {
  describe: "Ignore current Git branch and use this environment instead",
  requiresArg: true,
  type: "string",
};

require("yargs")
  .scriptName("dynamic")
  .usage("$0 <cmd> [args]")
  .command("init", "Creates a dynamic config file in package.json", {}, init)
  .command(
    "deploy [function]",
    "Deploys the application",
    (yargs) => {
      yargs
        .positional("function", {
          describe: "Fast deployment of a single function",
          type: "string",
        })
        .option("env", env)
        .example("$0 deploy", "Deploy the entire application")
        .example("$0 deploy getUsers", "Deploy only the getUsers function");
    },
    deploy
  )
  .command("show outputs", "Show information about website resources", {}, show)
  .command(
    "generate <template>",
    "Generate template files for the application",
    (yargs) => {
      yargs
        .positional("template", {
          describe: "Name of the template to generate",
          choices: ["route"],
        })
        .example(
          "$0 generate route",
          "Generate a CloudFormation template and code file for an AWS Lambda function attached to an AWS API Gateway"
        );
    },
    generate
  )
  .help().argv;
