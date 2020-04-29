#!/usr/bin/env node

const chalk = require("chalk");
const init = require("./commands/init");
const deploy = require("./commands/deploy");
const show = require("./commands/show");
const generate = require("./commands/generate");
const map = { init, deploy, show, generate };
const cmd = process.argv[2];

if (map.hasOwnProperty(cmd)) {
  map[cmd](process.argv).then(() => {});
} else {
  console.error(chalk.red(`Command not supported: ${cmd}`));
}
