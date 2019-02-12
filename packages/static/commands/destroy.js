const AWS = require("aws-sdk");

const destroy = async (profile, region, stackName) => {
  AWS.config.update({
    region,
    credentials: new AWS.SharedIniFileCredentials({ profile })
  });

  // MUST DELETE ALL S3 Objects here first!

  // Cloudformation!
  console.log("Deleting AWS Cloudformation stack");
  const cloudformation = new AWS.CloudFormation();
  await cloudformation.deleteStack({ StackName: stackName }).promise();

  console.log(
    `Stack deletion initiated! Please visit your AWS Cloudformation dashboard to follow the progress.`
  );
};

module.exports = destroy;
