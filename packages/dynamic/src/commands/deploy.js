const inquirer = require("inquirer");
const gitBranch = require("git-branch");
const {
  loadConfig,
  compileCloudformationTemplate,
  awsRegions
} = require("../utils");

const deploy = async args => {
  const branch = await gitBranch();
  const { name, conf } = loadConfig();
  const firstDeploy = !conf || !conf.environments[branch];
  const stack = `${name}-${branch}`;

  if (!name) {
    console.error(
      chalk.red(
        `Your package.json file must have a name to deploy with dynamic`
      )
    );
  }

  if (firstDeploy) {
    await createStack(stack, name, conf);
  } else {
    await updateStack();
  }
};

const createStack = async (stack, name, conf) => {
  // Get user consent
  // ----------------------------------

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

  // Basic AWS questions
  // ----------------------------------

  const aws = await inquirer.prompt([
    {
      type: "input",
      name: "profile",
      message: `Which AWS profile would you like to use?`
    },
    {
      type: "list",
      name: "region",
      message: `Which AWS region would you like to use for this project?`,
      choices: Object.keys(awsRegions).map(k => ({
        name: awsRegions[k],
        value: k
      }))
    },
    {
      type: "input",
      name: "bucket",
      message: `Which bucket would you like to use for the lambda ZIP files? This bucket will be created it if doesn't exist.`,
      default: `${name}-${operations}`
    }
  ]);

  AWS.config.update({
    region: aws.region,
    credentials: new AWS.SharedIniFileCredentials({ profile: aws.profile })
  });

  // Setup operations bucket
  // ----------------------------------

  // Check if operations bucket exists
  //   Create operations bucket if not

  const lambdas = await prepareAndUploadLambdas();

  const template = await compileCloudformationTemplate();

  // Add parameters
  //   all functionS3Key
  //   the operations bucket answer

  // Save everything into the environment package.json!
  // region, profile, etc.
};

const updateStack = async () => {
  //
};

module.exports = deploy;
