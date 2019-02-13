const AWS = require("aws-sdk");
const execa = require("execa");

const destroy = async (profile, region, stackName) => {
  AWS.config.update({
    region,
    credentials: new AWS.SharedIniFileCredentials({ profile })
  });

  // Delete all files in the bucket
  await execa(
    "aws",
    [
      "s3",
      "rm",
      `s3://${envConfig.bucket}`,
      "--profile",
      conf.awsProfile,
      "--region",
      conf.awsRegion,
      "--recursive"
    ],
    {
      stdout: "inherit"
    }
  );

  // Cloudformation!
  console.log("Deleting AWS Cloudformation stack");
  const cloudformation = new AWS.CloudFormation();
  await cloudformation.deleteStack({ StackName: stackName }).promise();

  console.log(
    `Stack deletion initiated! Please visit your AWS Cloudformation dashboard to follow the progress.`
  );
};

module.exports = destroy;
