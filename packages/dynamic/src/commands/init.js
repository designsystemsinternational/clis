const inquirer = require("inquirer");
const ora = require("ora");
const {
  loadConfig,
  saveConfig,
  awsRegions,
  checkS3BucketExists
} = require("../utils");
const AWS = require("aws-sdk");

const init = async args => {
  const { name, conf } = loadConfig();
  if (!name) {
    console.error(
      chalk.red(
        `Your package.json file must have a name in order to use dynamic`
      )
    );
  }

  // General project questions
  // ----------------------------------

  const aws = await inquirer.prompt([
    {
      type: "input",
      name: "profile",
      message: `Which AWS profile would you like to use for this project?`
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
      message: `Which bucket name would you like to use for the lambda ZIP files?`,
      default: `${name}-operations`
    }
  ]);

  AWS.config.update({
    region: aws.region,
    credentials: new AWS.SharedIniFileCredentials({ profile: aws.profile })
  });

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

  saveConfig(Object.assign(conf || {}, aws));
};

module.exports = init;
