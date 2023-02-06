import AWS from 'aws-sdk';

export const validateCloudFormationTemplate = async (template) => {
  const cloudformation = new AWS.CloudFormation();

  try {
    const result = await cloudformation
      .validateTemplate({
        TemplateBody: JSON.stringify(template),
      })
      .promise();

    return result;
  } catch (error) {
    console.log(error);
    throw new Error('Invalid CloudFormation template');
  }
};
