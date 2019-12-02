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
  uploadZips,
  newChangesetName,
  monitorStack,
  waitForChangeset
} = require("../utils");

const deploy = async args => {
  const branch = await gitBranch();
  const environment = branch === "master" ? "production" : branch;

  const { name, conf } = loadConfig();
  const firstDeploy =
    !conf || !conf.environments || !conf.environments[environment];

  const stackName = `${name}-${environment}`;

  if (firstDeploy) {
    await createStack(stackName, environment, conf);
  } else if (args[3]) {
    await updateFunction(stackName, environment, args[3], conf);
  } else {
    await updateStack(stackName, environment, conf);
  }
};

// Create Stack
// ---------------------------------------------------------------------

const createStack = async (stackName, environment, conf) => {
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

// Update Function
// ---------------------------------------------------------------------

const updateFunction = async (stackName, environment, functionName, conf) => {
  const AWS = getAWSWithProfile(conf.profile, conf.region);
  const cloudformation = new AWS.CloudFormation();
  const functionKey = `${functionName}S3Key`;

  // Load stack parameters
  // ----------------------------------

  const spinner = ora("Getting Cloudformation parameters").start();
  const res = await cloudformation
    .describeStacks({ StackName: stackName })
    .promise();
  const stack = res.Stacks[0];
  spinner.succeed();

  // You can only update a function if it already exists in the stack
  if (!stack.Parameters.find(p => p.ParameterKey === functionKey)) {
    console.error(
      chalk.red("Function does not exist. You must run a full deploy first.")
    );
    return;
  }

  // Build and upload lambda
  // ----------------------------------

  spinner.start("Preparing lambda package");
  const functions = await getFunctions(functionName);
  const stats = await buildFunctions(functions, "build");
  const zipInfo = await zipWebpackOutput(stats);
  spinner.succeed();

  spinner.start("Uploading lambda package to S3");
  const s3Info = await uploadZips(AWS, conf.bucket, environment, zipInfo);
  spinner.succeed();

  const parameters = stack.Parameters.map(p => {
    if (p.ParameterKey === `${functionName}S3Key`) {
      return {
        ParameterKey: p.ParameterKey,
        ParameterValue: s3Info[functionName].s3Key
      };
    } else {
      return {
        ParameterKey: p.ParameterKey,
        UsePreviousValue: true
      };
    }
    p.ParameterKey;
  });

  // Create and execute changeset
  // ----------------------------------

  spinner.start("Creating changeset");

  const changesetName = newChangesetName();

  const update = await cloudformation
    .createChangeSet({
      UsePreviousTemplate: true,
      ChangeSetName: changesetName,
      StackName: stackName,
      Parameters: parameters,
      Capabilities: ["CAPABILITY_NAMED_IAM"]
    })
    .promise();

  spinner.succeed();
  spinner.start("Waiting for changeset completion");

  await waitForChangeset(
    cloudformation,
    stackName,
    changesetName,
    "Status",
    "CREATE_COMPLETE"
  );

  spinner.succeed();
  spinner.start("Executing changeset");

  const executed = await cloudformation
    .executeChangeSet({
      StackName: stackName,
      ChangeSetName: changesetName
    })
    .promise();

  await monitorStack(AWS, stackName);

  spinner.succeed();
};

// Update Stack
// ---------------------------------------------------------------------

const updateStack = async (stackName, environment, conf) => {
  const AWS = getAWSWithProfile(conf.profile, conf.region);
  const cloudformation = new AWS.CloudFormation();

  // Compile template
  // ----------------------------------

  const spinner = ora("Compiling Cloudformation template").start();
  const template = await compileCloudformationTemplate();
  spinner.succeed();

  // Build lambdas
  // ----------------------------------

  spinner.start("Preparing lambda packages");
  const functions = await getFunctions();
  const stats = await buildFunctions(functions, "build");
  const zipInfo = await zipWebpackOutput(stats);
  spinner.succeed();

  // Ask for params
  // ----------------------------------

  let parameters = {};

  if (Object.keys(template.Parameters).length > 0) {
    parameters = await inquirer.prompt(
      paramsToInquirer(template.Parameters, { default: "Use Previous" })
    );
  }

  // Upload lambdas
  // ----------------------------------

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

  // Create and execute changeset
  // ----------------------------------

  const paramsWithPrevious = Object.keys(parameters).map(key => {
    const ParameterValue = parameters[key].toString();
    if (ParameterValue === "Use Previous") {
      return {
        ParameterKey: key,
        UsePreviousValue: true
      };
    } else {
      return {
        ParameterKey: key,
        ParameterValue
      };
    }
  });

  spinner.start("Creating changeset");

  const changesetName = newChangesetName();

  const update = await cloudformation
    .createChangeSet({
      TemplateBody: JSON.stringify(template),
      ChangeSetName: changesetName,
      StackName: stackName,
      Parameters: paramsWithPrevious,
      Capabilities: ["CAPABILITY_NAMED_IAM"]
    })
    .promise();

  spinner.succeed();
  spinner.start("Waiting for changeset completion");

  await waitForChangeset(
    cloudformation,
    stackName,
    changesetName,
    "Status",
    "CREATE_COMPLETE"
  );

  spinner.succeed();
  spinner.start("Executing changeset");

  const executed = await cloudformation
    .executeChangeSet({
      StackName: stackName,
      ChangeSetName: changesetName
    })
    .promise();

  await monitorStack(AWS, stackName);

  spinner.succeed();
};

module.exports = deploy;
