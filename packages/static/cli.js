#!/usr/bin/env node
const fs = require("fs");
const util = require("util");
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const inquirer = require("inquirer");

const createFunc = require("./commands/create");
const createTmpl = require("./commands/create.json");
const deployFunc = require("./commands/deploy");
const destroyFunc = require("./commands/destroy");

const configFile = "./.staticconfig";

const loadConfig = async () => {
  const json = await readFile(configFile);
  return JSON.parse(json);
};

const saveEnvironment = async (env, vars) => {
  const conf = await loadConfig();
  conf.environments = conf.environments || {};
  conf.environments[env] = vars;
  await writeFile(configFile, JSON.stringify(conf, null, 4));
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
    },
    {
      type: "input",
      name: "buildFolder",
      message: "Path to your build folder",
      default: "build"
    }
  ]);
  fs.writeFileSync(configFile, JSON.stringify(answers, null, 4));
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
  const questions = [
    {
      type: "input",
      name: "htmlCache",
      message: "Cloudfront cache time for HTML files (in seconds)",
      default: "300"
    },
    {
      type: "input",
      name: "assetsCache",
      message: "Cache time for all other assets (in seconds)",
      default: "31536000"
    }
  ];

  // Add questions based on Cloudformation parameters
  const parameterNames = Object.keys(createTmpl.Parameters);
  parameterNames.forEach(key => {
    // do not ask for parameters in dontAsk
    if (!dontAsk.includes(key)) {
      const obj = createTmpl.Parameters[key];
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

  // Find CloudFormation params in answers
  const cfAnswers = {};
  Object.keys(answers).forEach(key => {
    if (parameterNames.includes(key)) {
      cfAnswers[key] = answers[key];
    }
  });

  const all = Object.assign({}, dynamicDefaults, cfAnswers);
  await createFunc(conf.awsProfile, conf.awsRegion, stackName, all);
  await saveEnvironment(env, {
    stack: stackName,
    bucket: answers.S3BucketName,
    htmlCache: answers.htmlCache,
    assetsCache: answers.assetsCache
  });
};

// Deploy
// ----------------------------------------------------

const deploy = async args => {
  if (!args[3]) {
    return console.error("Please state which environment to deploy to");
  }

  const conf = await loadConfig();
  const env = args[3];
  const envConfig = conf.environments[env];

  if (!envConfig) {
    return console.error("Environment does not exist");
  }

  await deployFunc(conf, env);
};

// Destroy
// ----------------------------------------------------

const destroy = async args => {
  if (!args[3]) {
    return console.error("Please state which environment to deploy to");
  }

  const conf = await loadConfig();
  const env = args[3];
  const envConfig = conf.environments[env];

  if (!envConfig) {
    return console.error("Environment does not exist");
  }

  const answers = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `Warning! This will delete all files and resources in the ${
        envConfig.stack
      } stack. Continue?`
    }
  ]);

  if (!answers.confirm) {
    return;
  }

  await destroyFunc(conf.awsProfile, conf.awsRegion, envConfig.stack);
};

// Go Go Go!
// ----------------------------------------------------

const map = { init, create, deploy, destroy };
const cmd = process.argv[2];
if (map.hasOwnProperty(cmd)) {
  map[cmd](process.argv).then(() => {});
} else {
  console.error("Command not supported");
}
