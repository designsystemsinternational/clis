#!/usr/bin/env node
process.env.AWS_SDK_LOAD_CONFIG = true;

const fs = require("fs");
const util = require("util");
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const inquirer = require("inquirer");

const apiCreate = require("./commands/create");
const templateCreate = require("./commands/create.json");

const configFile = "./.staticconfig";

const loadConfig = async () => {
  const json = await readFile(configFile);
  return JSON.parse(json);
};

const saveEnvironment = async env => {
  const conf = await loadConfig();
  conf.environments = conf.environments || [];
  conf.environments.push(env);
  await writeFile(configFile, JSON.stringify(conf));
};

// Init
// ----------------------------------------------------

const init = async () => {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "awsProfile",
      message: "Name of the AWS profile you want to use",
      default: "default"
    },
    {
      type: "input",
      name: "awsRegion",
      message: "Name of AWS region for the S3 bucket",
      default: "us-east-1"
    },
    {
      type: "input",
      name: "websiteName",
      message: "Name of the website. No spaces or weirdo characters"
    }
  ]);
  fs.writeFileSync(configFile, JSON.stringify(answers));
  console.log("Config file saved!");
};

// Create
// ----------------------------------------------------

const create = async args => {
  if (!args[3]) {
    return console.error("Please state a name for this environment");
  }

  const conf = await loadConfig();
  const env = args[3];
  const stackName = `${conf.websiteName}-${env}`;

  // We don't prompt for these Cloudformation params,
  // but simply rely on their default values.
  const dontAsk = [];

  // These default values are used in question prompts.
  // If a parameter is also in dontAsk, this default will
  // be passed directly to CloudFormation.
  const dynamicDefaults = {
    S3BucketName: stackName
  };

  // Default questions
  const questions = [];

  // Add questions based on Cloudformation parameters
  const parameterNames = Object.keys(templateCreate.Parameters);
  parameterNames.forEach(key => {
    // do not ask for parameters in dontAsk
    if (!dontAsk.includes(key)) {
      const obj = templateCreate.Parameters[key];
      questions.push({
        name: key,
        type: obj.AllowedValues ? "list" : "input",
        message: obj.Description,
        default: dynamicDefaults[key] || obj.Default,
        choices: obj.AllowedValues
      });
    }
  });

  const answers = await inquirer.prompt(questions);
  const all = Object.assign({}, dynamicDefaults, answers);
  await apiCreate(conf.awsProfile, conf.awsRegion, stackName, all);
  await saveEnvironment(env);
};

// Deploy
// ----------------------------------------------------

const deploy = async () => {};

// Destroy
// ----------------------------------------------------

const destroy = async () => {};

// Go Go Go!
// ----------------------------------------------------

const map = { init, create, deploy, destroy };
const cmd = process.argv[2];
if (map.hasOwnProperty(cmd)) {
  map[cmd](process.argv).then(() => console.log("Done"));
} else {
  console.error("Command not supported");
}
