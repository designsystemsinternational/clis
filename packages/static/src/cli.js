#!/usr/bin/env node

const init = require("./commands/init");
const deploy = require("./commands/deploy");
const destroy = require("./commands/destroy");
const show = require("./commands/show");
const version = require("./commands/version");
const help = require("./commands/help");

const map = { init, deploy, destroy, show, version };

const cmd = process.argv[2];
if (map.hasOwnProperty(cmd)) {
  map[cmd](process.argv)
    .then(() => {})
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
} else if (cmd == "help") {
  help(map);
} else {
  console.error("Command not supported");
}
