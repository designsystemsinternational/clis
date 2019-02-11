const AWS = require("aws-sdk");
const template = require("./create.json");

const create = async (profile, region, stackName, stackParameters) => {
  AWS.config.update({
    region,
    credentials: new AWS.SharedIniFileCredentials({ profile })
  });

  // turn object of stackParameters into CloudFormation parameters
  const parameters = [];
  Object.keys(stackParameters).forEach(key => {
    parameters.push({
      ParameterKey: key,
      ParameterValue: stackParameters[key].toString()
    });
  });

  // Cloudformation!
  console.log("Creating resources with AWS Cloudformation");
  const cloudformation = new AWS.CloudFormation();
  const create = await cloudformation
    .createStack({
      StackName: stackName,
      Parameters: parameters,
      TemplateBody: JSON.stringify(template),
      Capabilities: ["CAPABILITY_NAMED_IAM"]
    })
    .promise();

  console.log(
    `Resources created! Please visit your AWS Cloudformation dashboard to see the URL of your S3 and Cloudfront resources.`
  );
};

module.exports = create;
