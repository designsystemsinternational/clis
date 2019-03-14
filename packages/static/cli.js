#!/usr/bin/env node

const { man } = require("./utils");
const init = require("./commands/init");
const create = require("./commands/create");
const deploy = require("./commands/deploy");
const destroy = require("./commands/destroy");

const map = { init, create, deploy, destroy };
const cmd = process.argv[2];
if (map.hasOwnProperty(cmd)) {
  map[cmd](process.argv).then(() => {});
} else {
  console.error("Command not supported");
  console.log(man(map));
}
