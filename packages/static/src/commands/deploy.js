const execa = require("execa");
const ora = require("ora");
const Table = require("cli-table3");
const inquirer = require("inquirer");
const {
  loadConfig,
  getEnvironment,
  getEnvironmentConfig,
  saveEnvironmentConfig,
  getAWSWithProfile,
  monitorStack
} = require("@designsystemsinternational/cli-utils");
const { NO_STATIC_CONFIG } = require("../utils");
const s3Template = require("../cloudformation/s3.json");
const cloudfrontTemplate = require("../cloudformation/cloudfront.json");

// Main
// ---------------------------------------------------------------------

const deploy = async args => {
  const { conf, packageJson } = loadConfig("static");
  if (!conf) {
    throw NO_STATIC_CONFIG;
  }
  const env = await getEnvironment();
  const envConf = getEnvironmentConfig(conf, env);
  if (!envConf) {
    await createStack(env, conf, packageJson);
  } else {
    await uploadFiles(env, conf, packageJson, envConf);
  }
};

// Create Stack
// ---------------------------------------------------------------------

const createStack = async (env, conf, packageJson) => {
  const AWS = getAWSWithProfile(conf.profile, conf.region);

  const initAnswers = await inquirer.prompt([
    {
      type: "input",
      name: "stackName",
      message: `Name of the new Cloudformation stack`,
      default: `${packageJson.name}-${env}`
    },
    {
      type: "confirm",
      name: "createCloudfront",
      message: "Do you want to set up a Cloudfront distribution?",
      default: true
    },
    {
      type: "input",
      name: "htmlCache",
      message: "Cache time for HTML files (in seconds)",
      default: "300"
    },
    {
      type: "input",
      name: "assetsCache",
      message: "Cache time for all other assets (in seconds)",
      default: "31536000"
    }
  ]);

  // We don't prompt for these Cloudformation params,
  // but simply rely on their default values.
  const dontAsk = [];

  // These default values are used in question prompts.
  // If a parameter is also in dontAsk, this default will
  // be passed directly to CloudFormation.
  const dynamicDefaults = {
    S3BucketName: initAnswers.stackName
  };

  // Combine cloudformation templates if needed
  // We perform a somewhat deep copy to not mess up the tests.
  const createTemplate = {};
  createTemplate.Parameters = Object.assign({}, s3Template.Parameters);
  createTemplate.Resources = Object.assign({}, s3Template.Resources);
  createTemplate.Outputs = Object.assign({}, s3Template.Outputs);
  if (initAnswers.createCloudfront) {
    Object.assign(createTemplate.Parameters, cloudfrontTemplate.Parameters);
    Object.assign(createTemplate.Resources, cloudfrontTemplate.Resources);
    Object.assign(createTemplate.Outputs, cloudfrontTemplate.Outputs);
  }

  // Add questions based on Cloudformation parameters
  const templateQuestions = Object.keys(createTemplate.Parameters)
    .filter(key => !dontAsk.includes(key))
    .map(key => {
      const obj = createTemplate.Parameters[key];
      return {
        name: key,
        type: obj.AllowedValues ? "list" : "input",
        message: obj.Description,
        default: dynamicDefaults[key] || obj.Default,
        choices: obj.AllowedValues
      };
    });

  const templateAnswers = await inquirer.prompt(templateQuestions);
  const parameters = Object.assign({}, dynamicDefaults, templateAnswers);

  const spinner = ora("Creating stack").start();

  const cloudformation = new AWS.CloudFormation();
  const create = await cloudformation
    .createStack({
      StackName: initAnswers.stackName,
      Parameters: Object.keys(parameters).map(key => ({
        ParameterKey: key,
        ParameterValue: parameters[key].toString()
      })),
      TemplateBody: JSON.stringify(createTemplate),
      Capabilities: ["CAPABILITY_NAMED_IAM"]
    })
    .promise();

  const created = await cloudformation
    .waitFor("stackCreateComplete", {
      StackName: initAnswers.stackName
    })
    .promise();

  spinner.succeed();

  spinner.start("Saving environment config");
  saveEnvironmentConfig("static", env, {
    stack: initAnswers.stackName,
    bucket: parameters.S3BucketName,
    htmlCache: initAnswers.htmlCache,
    assetsCache: initAnswers.assetsCache
  });
  spinner.succeed();

  // Listen for changes to cloudformation
  await monitorStack(AWS, create.StackId);

  const stacks = await cloudformation
    .describeStacks({ StackName: initAnswers.stackName })
    .promise();

  const table = new Table({
    head: ["Key", "Value", "Description"]
  });

  stacks.Stacks[0].Outputs.forEach(o =>
    table.push([o.OutputKey, o.OutputValue, o.Description])
  );

  console.log(table.toString());
  console.log("Now run deploy again to upload the files");
};

// Upload Files
// ---------------------------------------------------------------------

const uploadFiles = async (env, conf, packageJson, envConf) => {
  if (conf.shouldRunBuildCommand) {
    await execa.shell(conf.buildCommand, {
      stdout: "inherit"
    });
  }

  // Sync assets
  await execa(
    "aws",
    [
      "s3",
      "sync",
      `./${conf.buildDir}`,
      `s3://${envConf.bucket}`,
      "--profile",
      conf.profile,
      "--region",
      conf.region,
      "--exclude",
      "*.html",
      "--exclude",
      "*.json",
      "--acl",
      "public-read",
      "--cache-control",
      `max-age=${envConf.assetsCache}`
    ],
    {
      stdout: "inherit"
    }
  );

  // Sync HTML and JSON
  await execa(
    "aws",
    [
      "s3",
      "sync",
      `./${conf.buildDir}`,
      `s3://${envConf.bucket}`,
      "--profile",
      conf.profile,
      "--region",
      conf.region,
      "--exclude",
      "*",
      "--include",
      "*.html",
      "--include",
      "*.json",
      "--acl",
      "public-read",
      "--cache-control",
      `max-age=${envConf.htmlCache}`
    ],
    {
      stdout: "inherit"
    }
  );

  console.log("Deployed!");
};

deploy.description = "Deploys a distribution, creating it if needed";
module.exports = deploy;
