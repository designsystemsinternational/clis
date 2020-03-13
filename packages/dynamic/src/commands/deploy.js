const inquirer = require("inquirer");
const chalk = require("chalk");
const ora = require("ora");
const {
  NO_DYNAMIC_CONFIG,
  configDefaults,
  getFunctions,
  buildFunctions,
  compileCloudformationTemplate,
  addS3Keys
} = require("../utils");
const {
  getEnvironment,
  getEnvironmentConfig,
  getStackName,
  loadConfig,
  saveConfig,
  getAWSWithProfile,
  paramsToInquirer,
  zipWebpackOutput,
  uploadFilesToS3,
  newChangesetName,
  monitorStack,
  waitForChangeset
} = require("@designsystemsinternational/cli-utils");

const deploy = async args => {
  const { conf, packageJson } = loadConfig("dynamic");

  if (!conf) {
    throw NO_DYNAMIC_CONFIG;
  }
  const confWithDefaults = Object.assign({}, configDefaults, conf);

  const env = await getEnvironment();
  const envConf = getEnvironmentConfig(confWithDefaults, env);

  if (!envConf) {
    await createStack(env, packageJson, confWithDefaults, envConf);
  } else if (args && args[3]) {
    await updateFunction(env, packageJson, confWithDefaults, envConf, args[3]);
  } else {
    await updateStack(env, packageJson, confWithDefaults, envConf);
  }
};

// Create Stack
// ---------------------------------------------------------------------

const createStack = async (env, packageJson, conf, envConf) => {
  const init = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `This will create a new ${env} environment. Proceed?`
    }
  ]);

  if (!init.confirm) {
    console.error(chalk.red(`Aborting`));
    return;
  }

  const { stackName } = await inquirer.prompt([
    {
      type: "input",
      name: "stackName",
      message: `Name of the new Cloudformation stack`,
      default: `${packageJson.name}-${env}`
    }
  ]);

  const AWS = getAWSWithProfile(conf.profile, conf.region);

  // Compile template and ask for params
  // ----------------------------------

  const spinner = ora("Compiling Cloudformation template").start();
  const template = await compileCloudformationTemplate(conf);
  spinner.succeed();

  let parameters = {};

  if (Object.keys(template.Parameters).length > 0) {
    parameters = await inquirer.prompt(paramsToInquirer(template.Parameters));
  }

  // Build and upload lambdas
  // ----------------------------------

  spinner.start("Preparing lambda packages");
  const functions = await getFunctions(conf);
  const stats = await buildFunctions(conf, functions);
  const functionsInfo = await zipWebpackOutput(stats);
  spinner.succeed();

  spinner.start("Uploading lambda packages to S3");
  await addS3Keys(env, functionsInfo);
  const uploadInfo = {};
  Object.keys(functionsInfo).forEach(key => {
    uploadInfo[functionsInfo[key].zipFile] = functionsInfo[key].s3Key;
  });
  await uploadFilesToS3(AWS, conf.bucket, uploadInfo);
  spinner.succeed();

  // Assign automatic parameters
  // ----------------------------------

  addAutomaticParameterValues(parameters, template, conf, env, functionsInfo);

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

  conf.environments[env] = {
    stackName
  };
  saveConfig(conf);
};

// Update Function
// ---------------------------------------------------------------------

const updateFunction = async (
  env,
  packageJson,
  conf,
  envConf,
  functionName
) => {
  const AWS = getAWSWithProfile(conf.profile, conf.region);
  const cloudformation = new AWS.CloudFormation();
  const functionKey = `${functionName}S3Key`;

  // Load stack parameters
  // ----------------------------------

  const spinner = ora("Getting Cloudformation parameters").start();
  const res = await cloudformation
    .describeStacks({ StackName: envConf.stackName })
    .promise();
  const stack = res.Stacks[0];
  spinner.succeed();

  // You can only update a function if it already exists in the stack
  if (!stack.Parameters.find(p => p.ParameterKey === functionKey)) {
    console.error(
      chalk.red("Function does not exist. Please run a full deploy.")
    );
    return;
  }

  // Build and upload lambda
  // ----------------------------------

  spinner.start("Preparing lambda package");
  const functions = await getFunctions(conf, functionName);
  const stats = await buildFunctions(conf, functions);
  const functionsInfo = await zipWebpackOutput(stats);
  spinner.succeed();

  spinner.start("Uploading lambda package to S3");
  await addS3Keys(env, functionsInfo);
  const uploadInfo = {};
  Object.keys(functionsInfo).forEach(key => {
    uploadInfo[functionsInfo[key].zipFile] = functionsInfo[key].s3Key;
  });
  await uploadFilesToS3(AWS, conf.bucket, uploadInfo);
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
      StackName: envConf.stackName,
      Parameters: parameters,
      Capabilities: ["CAPABILITY_NAMED_IAM"]
    })
    .promise();

  spinner.succeed();
  spinner.start("Waiting for changeset completion");

  await waitForChangeset(
    cloudformation,
    envConf.stackName,
    changesetName,
    "Status",
    "CREATE_COMPLETE"
  );

  spinner.succeed();
  spinner.start("Executing changeset");

  const executed = await cloudformation
    .executeChangeSet({
      StackName: envConf.stackName,
      ChangeSetName: changesetName
    })
    .promise();

  await monitorStack(AWS, envConf.stackName);

  spinner.succeed();
};

// Update Stack
// ---------------------------------------------------------------------

const updateStack = async (env, packageJson, conf, envConf) => {
  const AWS = getAWSWithProfile(conf.profile, conf.region);
  const cloudformation = new AWS.CloudFormation();

  // Compile template
  // ----------------------------------

  const spinner = ora("Compiling Cloudformation template").start();
  const template = await compileCloudformationTemplate(conf);
  spinner.succeed();

  // Build lambdas
  // ----------------------------------

  spinner.start("Preparing lambda packages");
  const functions = await getFunctions(conf);
  const stats = await buildFunctions(conf, functions);
  const functionsInfo = await zipWebpackOutput(stats);
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
  await addS3Keys(env, functionsInfo);
  const uploadInfo = {};
  Object.keys(functionsInfo).forEach(key => {
    uploadInfo[functionsInfo[key].zipFile] = functionsInfo[key].s3Key;
  });
  await uploadFilesToS3(AWS, conf.bucket, uploadInfo);
  spinner.succeed();

  // Assign automatic parameters
  // ----------------------------------

  addAutomaticParameterValues(parameters, template, conf, env, functionsInfo);

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
      StackName: envConf.stackName,
      Parameters: paramsWithPrevious,
      Capabilities: ["CAPABILITY_NAMED_IAM"]
    })
    .promise();

  spinner.succeed();
  spinner.start("Waiting for changeset completion");

  await waitForChangeset(
    cloudformation,
    envConf.stackName,
    changesetName,
    "Status",
    "CREATE_COMPLETE"
  );

  spinner.succeed();
  spinner.start("Executing changeset");

  const executed = await cloudformation
    .executeChangeSet({
      StackName: envConf.stackName,
      ChangeSetName: changesetName
    })
    .promise();

  await monitorStack(AWS, envConf.stackName);

  spinner.succeed();
};

// Helpers
// ---------------------------------------------------------------------

const addAutomaticParameterValues = (
  parameters,
  template,
  conf,
  env,
  functionsInfo
) => {
  template.Parameters["operationsS3Bucket"] = {
    Description: "Bucket that holds the lambda deployment zip files",
    Type: "String"
  };
  parameters["operationsS3Bucket"] = conf.bucket;

  template.Parameters["environment"] = {
    Description: "Stack environment based on Git branch",
    Type: "String"
  };
  parameters["environment"] = env;

  Object.keys(functionsInfo).forEach(key => {
    const paramName = `${key}S3Key`;
    template.Parameters[paramName] = {
      Description: `Path to the ${key} lambda code in the operations bucket`,
      Type: "String"
    };
    parameters[paramName] = functionsInfo[key].s3Key;
  });
};

module.exports = deploy;
