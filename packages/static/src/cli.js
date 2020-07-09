#!/usr/bin/env node

const init = require("./commands/init");
const deploy = require("./commands/deploy");
const destroy = require("./commands/destroy");
const show = require("./commands/show");
const open = require("./commands/open");

const env = {
  describe: "Ignore current Git branch and use this environment instead",
  requiresArg: true,
  type: "string"
};

require("yargs")
  .scriptName("static")
  .usage("$0 <cmd> [args]")
  .command("init", "Creates a static config file in package.json", {}, init)
  .command(
    "deploy",
    "Deploys the website",
    yargs => {
      yargs.option("env", env).option("configure", {
        describe: "Reconfigure the CloudFormation stack",
        type: "boolean"
      });
    },
    deploy
  )
  .command(
    "destroy",
    "Deletes the website and all its resources",
    yargs => {
      yargs.option("env", env);
    },
    destroy
  )
  .command("show", "Show information about website resources", {}, show)
  .command(
    "open [search]",
    "Shortcut to open a url from the `show` command",
    yargs => {
      yargs.positional("search", {
        describe: "Partial search key to find URL. Try `S3` or `Cloudfront` ",
        type: "string"
      });
    },
    open
  )
  .help().argv;
