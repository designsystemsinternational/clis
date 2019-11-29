const inquirer = require("inquirer");
const gitBranch = require("git-branch");
const chalk = require("chalk");
const ora = require("ora");
const {
  loadConfig,
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
  const stack = `${name}-${environment}`;

  if (firstDeploy) {
    await createStack(stack, name, environment, conf);
  } else {
    await updateStack();
  }
};

const createStack = async (stack, name, environment, conf) => {
  const init = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `This will create a new cloudformation stack called ${stack}. Proceed?`
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

  console.log(s3Info);

  // Assign automatic parameters
  // ----------------------------------

  // Assign lambda names: functionS3Key

  // Create stack
  // ----------------------------------

  // Save everything into the environment package.json!
  // region, profile, etc.
};

const updateStack = async () => {
  //
};

module.exports = deploy;
