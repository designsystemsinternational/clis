#!/usr/bin/env node

const init = require("./commands/init");
const deploy = require("./commands/deploy");
const destroy = require("./commands/destroy");
const show = require("./commands/show");
const open = require("./commands/open");

const env = {
  describe: "Force environment name by ignoring Git branch",
  requiresArg: true
};

require("yargs")
  .scriptName("static")
  .usage("$0 <cmd> [args]")
  .command("init", "Initializes a project", {}, init)
  .command(
    "deploy",
    "Deploys an environment based on the current Git branch, creating it if needed",
    { env },
    deploy
  )
  .command(
    "destroy",
    "Deletes an environment and all its resources",
    { env },
    destroy
  )
  .command(
    "show <key>",
    "Show repo information",
    yargs => {
      yargs.positional("key", {
        describe: "Name of data you want to show",
        default: "outputs",
        choices: ["outputs"]
      });
    },
    show
  )
  .command(
    "open [key]",
    "Opens a url from the `show outputs` command, using [key] to find a partial match.",
    { env },
    open
  )
  .help().argv;
