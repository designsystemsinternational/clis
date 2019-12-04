#!/usr/bin/env node

const chalk = require("chalk");
const { man } = require("./utils");
const init = require("./commands/init");
const deploy = require("./commands/deploy");
const show = require("./commands/show");
const map = { init, deploy, show };
const cmd = process.argv[2];

if (map.hasOwnProperty(cmd)) {
  map[cmd](process.argv).then(() => {});
} else {
  console.error(chalk.red(`Command not supported: ${cmd}`));
}
