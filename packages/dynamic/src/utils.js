const { join, basename, relative } = require("path");
const recursiveReadDir = require("recursive-readdir");
const webpack = require("webpack");
const defaultConfig = require("./default.webpack.config");
const chalk = require("chalk");
const micromatch = require("micromatch");

// Constants
// ---------------------------------------------------

const NO_DYNAMIC_CONFIG =
  "No dynamic config found. Please run the init command to set up this package";

// Config defaults
// ---------------------------------------------------

const configDefaults = {
  cloudformationMatch: ["functions/**/cf.js"],
  lambdaMatch: ["functions/**/*.js", "!functions/**/cf.js"],
  buildDir: "build"
};

// Lambda utils
// ---------------------------------------------------

// This will return every file in /functions not named cf.js
// We do this to not have a config file where you declare your functions, but it
// requires the repo to not have two functions named the same AND not have utils
// files inside of the /functions folder. Let's reconsider after using for a while.
const getFunctions = async name => {
  const files = await recursiveReadDir(join(process.cwd(), "functions"), [
    "node_modules",
    "cf.js"
  ]);
  const functions = files.map(f => ({
    name: basename(f, ".js"),
    path: f
  }));
  if (name) {
    return functions.filter(f => f.name === name);
  } else {
    return functions;
  }
};

const buildFunctions = async (functions, buildFolder) => {
  const entries = {};
  functions.forEach(f => (entries[f.name] = f.path));
  return new Promise((resolve, reject) => {
    webpack(defaultConfig(entries, buildFolder), (err, stats) => {
      if (err || stats.hasErrors()) {
        console.error("Webpack build had errors:", stats.toJson("minimal"));
        reject(err || stats.hasErrors());
      } else {
        resolve(stats.toJson());
      }
    });
  });
};

// Cloudformation utils
// ---------------------------------------------------

// Recursively search for cf.js files and compile into one
// template object. Throws error if two attributes are the same.
const compileCloudformationTemplate = async conf => {
  const cwd = process.cwd();
  const allFiles = await recursiveReadDir(cwd, [
    "node_modules",
    ".git",
    "package.json"
  ]);
  const relFiles = allFiles.map(f => relative(cwd, f));
  const templates = micromatch(relFiles, conf.cloudformationMatch).map(f =>
    require(join(cwd, f))
  );
  const base = { Parameters: {}, Resources: {}, Outputs: {} };
  const templateKeys = Object.keys(base);
  templates.forEach(tmpl => {
    templateKeys.forEach(tmplKey => {
      // If the cf.js file has one of the three CF keys
      // Move all the keys inside to the template object.
      if (tmpl.hasOwnProperty(tmplKey)) {
        Object.keys(tmpl[tmplKey]).forEach(key => {
          if (base[tmplKey].hasOwnProperty(key)) {
            console.error(chalk.red(`Identital names found in cf.js: ${key}`));
          } else {
            base[tmplKey][key] = tmpl[tmplKey][key];
          }
        });
      }
    });
  });

  return base;
};

module.exports = {
  NO_DYNAMIC_CONFIG,
  configDefaults,
  compileCloudformationTemplate,
  getFunctions,
  buildFunctions
};
