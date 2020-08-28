const inquirer = require("inquirer");
const ora = require("ora");
const {
  loadConfig,
  saveConfig,
  awsRegions,
  checkS3BucketExists,
  getAWSWithProfile,
  formatAwsName
} = require("@designsystemsinternational/cli-utils");
const {
  INIT_WITH_CONFIG
} = require("@designsystemsinternational/cli-utils/src/constants");

const init = async args => {
  const { conf, packageJson } = loadConfig("dynamic");
  if (conf) {
    throw INIT_WITH_CONFIG;
  }

  // General questions
  // ----------------------------------

  const aws = await inquirer.prompt([
    {
      name: "profile",
      type: "input",
      message: `Which AWS profile would you like to use for this project?`
    },
    {
      name: "region",
      type: "list",
      message: `Which AWS region would you like to use for this project?`,
      choices: Object.keys(awsRegions).map(k => ({
        name: awsRegions[k],
        value: k
      }))
    },
    {
      name: "bucket",
      type: "input",
      message: `Which bucket name would you like to use for the lambda ZIP files?`,
      default: packageJson.name
        ? formatAwsName(packageJson.name, "operations")
        : undefined
    }
  ]);

  const AWS = getAWSWithProfile(aws.profile, aws.region);

  // Operations bucket
  // ----------------------------------

  const spinner = ora("Checking if S3 bucket exists").start();

  const bucketExists = await checkS3BucketExists(AWS, aws.bucket);
  if (!bucketExists) {
    spinner.fail("S3 bucket does not exist");
    spinner.start("Creating S3 bucket");
    const s3 = new AWS.S3();
    const res = await s3.createBucket({ Bucket: aws.bucket }).promise();
    spinner.succeed("S3 bucket created!");
  } else {
    spinner.succeed("S3 bucket exists!");
  }

  // Update config file
  // ----------------------------------

  spinner.succeed("package.json file updated!");

  saveConfig("dynamic", Object.assign(conf || {}, aws));
};

module.exports = init;
