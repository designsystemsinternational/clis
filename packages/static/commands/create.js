const AWS = require("aws-sdk");
const s3Template = require("../cloudformation/s3.json");
const cloudfrontTemplate = require("../cloudformation/cloudfront.json");
const {
  monitorStack,
  hasConfig,
  hasEnv,
  saveEnv,
  loadConfig
} = require("../utils");
const inquirer = require("inquirer");

const create = async args => {
  if (!hasConfig()) {
    console.error("Could not find config file. Please run init first.");
    return process.exit();
  }

  if (!args[3]) {
    return console.error("Please state a name for this environment");
  }

  const conf = loadConfig();
  const env = args[3];
  const stackName = `${conf.websiteName}-${env}`;

  // Check that this environment does not exist
  if (hasEnv(conf, env)) {
    console.error("This environment already exists");
    process.exit();
  }

  AWS.config.update({
    region: conf.awsRegion,
    credentials: new AWS.SharedIniFileCredentials({ profile: conf.awsProfile })
  });

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
  const initAnswers = await inquirer.prompt([
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

  // Combine cloudformation templates if needed
  const createTemplate = Object.assign({}, s3Template);
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
  const all = Object.assign({}, dynamicDefaults, templateAnswers);

  // turn object of stackParameters into CloudFormation parameters
  const parameters = [];
  Object.keys(all).forEach(key => {
    parameters.push({
      ParameterKey: key,
      ParameterValue: all[key].toString()
    });
  });

  // Cloudformation!
  console.log("Creating resources with AWS Cloudformation");
  const cloudformation = new AWS.CloudFormation();
  const create = await cloudformation
    .createStack({
      StackName: stackName,
      Parameters: parameters,
      TemplateBody: JSON.stringify(createTemplate),
      Capabilities: ["CAPABILITY_NAMED_IAM"]
    })
    .promise();

  saveEnv(env, {
    stack: stackName,
    bucket: all.S3BucketName,
    htmlCache: initAnswers.htmlCache,
    assetsCache: initAnswers.assetsCache
  });

  // Listen for changes to cloudformation
  await monitorStack(AWS, create.StackId);

  const stacks = await cloudformation
    .describeStacks({ StackName: stackName })
    .promise();

  console.log("");
  console.log("Resources");
  console.log("--------------------------");
  console.log("");
  stacks.Stacks[0].Outputs.forEach(output => {
    console.log(output.OutputKey);
    console.log(output.Description);
    console.log(output.OutputValue);
    console.log("");
  });
};

module.exports = create;
