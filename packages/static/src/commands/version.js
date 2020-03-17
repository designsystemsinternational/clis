const pack = require("../../package.json");

const version = async args => {
  console.log("Current version:", pack.version);
};

version.description = "Displays current package version";

module.exports = version;
