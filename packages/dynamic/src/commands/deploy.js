const inquirer = require("inquirer");
const gitBranch = require("git-branch");
const chalk = require("chalk");
const ora = require("ora");
const {
  loadConfig,
  saveConfig,
  getAWSWithProfile,
  compileCloudformationTemplate,
  paramsToInquirer,
  getFunctions,
  buildFunctions,
  zipWebpackOutput,
  uploadZips
} = require("../utils");

const deploy = async args => {
  const branch = await gitBranch();
  const { name, conf } = loadConfig();
  const firstDeploy = !conf || !conf.environments || !conf.environments[branch];

  const environment = branch === "master" ? "production" : branch;
  const stackName = `${name}-${environment}`;

  if (firstDeploy) {
    await createStack(stackName, name, environment, conf);
  } else {
    await updateStack();
  }
};

const createStack = async (stackName, name, environment, conf) => {
  const init = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `This will create a new cloudformation stack called ${stackName}. Proceed?`
    }
  ]);

  if (!init.confirm) {
    console.error(chalk.red(`Aborting`));
    return;
  }

  const AWS = getAWSWithProfile(conf.profile, conf.region);

  // Compile template and ask for params
  // ----------------------------------

  const spinner = ora("Compiling Cloudformation template").start();
  const template = await compileCloudformationTemplate();
  spinner.succeed();

  let parameters = {};

  if (Object.keys(template.Parameters).length > 0) {
    parameters = await inquirer.prompt(paramsToInquirer(template.Parameters));
  }

  // Build and upload lambdas
  // ----------------------------------

  spinner.start("Preparing lambda packages");
  const functions = await getFunctions();
  const stats = await buildFunctions(functions, "build");
  const zipInfo = await zipWebpackOutput(stats);
  spinner.succeed();

  spinner.start("Uploading lambda packages to S3");
  const s3Info = await uploadZips(AWS, conf.bucket, environment, zipInfo);
  spinner.succeed();

  // Assign automatic parameters
  // ----------------------------------

  template.Parameters["operationsS3Bucket"] = {
    Description: "Bucket that holds the lambda deployment zip files",
    Type: "String"
  };
  parameters["operationsS3Bucket"] = conf.bucket;

  template.Parameters["environment"] = {
    Description: "Stack environment based on Git branch",
    Type: "String"
  };
  parameters["environment"] = environment;

  Object.keys(s3Info).forEach(key => {
    const paramName = `${key}S3Key`;
    template.Parameters[paramName] = {
      Description: `Path to the ${key} lambda code in the operations bucket`,
      Type: "String"
    };
    parameters[paramName] = s3Info[key].s3Key;
  });

  // Create stack
  // ----------------------------------

  spinner.start(`Creating Cloudformation stack: ${stackName}`);
  const cloudformation = new AWS.CloudFormation();
  const create = await cloudformation
    .createStack({
      StackName: stackName,
      TemplateBody: JSON.stringify(template),
      Parameters: Object.keys(parameters).map(key => ({
        ParameterKey: key,
        ParameterValue: parameters[key].toString()
      })),
      Capabilities: ["CAPABILITY_NAMED_IAM"]
    })
    .promise();

  const created = await cloudformation
    .waitFor("stackCreateComplete", {
      StackName: stackName
    })
    .promise();

  spinner.succeed();

  if (!conf.environments) {
    conf.environments = {};
  }

  conf.environments[environment] = {};
  saveConfig(conf);
};

const updateStack = async () => {
  //
};

module.exports = deploy;
