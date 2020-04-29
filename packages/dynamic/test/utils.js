const { join } = require("path");
const { existsSync } = require("fs");

const lambdaExists = name =>
  existsSync(join(__dirname, "build", name, "index.js"));

const zipExists = filename => existsSync(join(__dirname, "build", filename));

module.exports = {
  lambdaExists,
  zipExists
};
