const { join, basename, relative } = require("path");
const recursiveReadDir = require("recursive-readdir");
const webpack = require("webpack");
const defaultConfig = require("./default.webpack.config");
const chalk = require("chalk");
const micromatch = require("micromatch");
const md5File = require("md5-file/promise");

// Constants
// ---------------------------------------------------

const NO_DYNAMIC_CONFIG =
  "No dynamic config found. Please run the init command to set up this package";

// Config defaults
// ---------------------------------------------------

const configDefaults = {
  cloudformationMatch: ["functions/**/*cf.js"],
  lambdaMatch: ["functions/**/*.js", "!functions/**/*cf.js"],
  buildDir: "build"
};

// Lambda utils
// ---------------------------------------------------

const getFunctions = async (conf, name) => {
  const cwd = process.cwd();
  const allFiles = await recursiveReadDir(cwd, [
    "node_modules",
    ".git",
    "package.json"
  ]);
  const relFiles = allFiles.map(f => relative(cwd, f));
  const functions = micromatch(relFiles, conf.lambdaMatch).map(f => ({
    name: basename(f, ".js"),
    path: join(cwd, f)
  }));
  if (name) {
    return functions.filter(f => f.name === name);
  } else {
    return functions;
  }
};

const buildFunctions = async (conf, functions) => {
  const entries = {};
  functions.forEach(f => (entries[f.name] = f.path));
  return new Promise((resolve, reject) => {
    webpack(defaultConfig(entries, conf), (err, stats) => {
      if (err || stats.hasErrors()) {
        console.error("Webpack build had errors:", stats.toJson("minimal"));
        reject(err || stats.hasErrors());
      } else {
        resolve(stats.toJson());
      }
    });
  });
};

const addS3KeyValues = async (env, functionsInfo) => {
  const keys = Object.keys(functionsInfo);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const hash = await md5File(functionsInfo[key].orgFile);
    functionsInfo[key].s3Key = `functions/${env}/${key}-${hash}.zip`;
  }
};

// Cloudformation utils
// ---------------------------------------------------

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
  buildFunctions,
  addS3KeyValues
};
