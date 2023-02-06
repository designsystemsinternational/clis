import fs from 'node:fs';

import AWS from 'aws-sdk';

import { delay } from './misc';

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

export const bucketExists = async (bucketName, AWS) => {
  const s3 = new AWS.S3();
  try {
    await s3.headBucket({ Bucket: bucketName }).promise();
    return true;
  } catch (error) {
    if (error.statusCode === 404) {
      return false;
    }
    throw error;
  }
};

export const createBucketIfNonExisting = async (bucketName, AWS) => {
  const exists = await bucketExists(bucketName, AWS);
  if (!exists) {
    const s3 = new AWS.S3();
    await s3.createBucket({ Bucket: bucketName }).promise();
  }
};

export const uploadFileToS3 = async ({
  bucketName,
  localFile,
  remoteFile,
  AWS,
}) => {
  const s3 = new AWS.S3();
  const stream = fs.createReadStream(localFile);
  await s3
    .upload({
      Bucket: bucketName,
      Key: remoteFile,
      Body: stream,
    })
    .promise();
};

export const newChangesetName = () => {
  const now = new Date();
  return `deploy-${now.getFullYear()}-${
    now.getMonth() + 1
  }-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
};

export const shouldExecuteChangeset = async ({
  stack,
  changesetName,
  cloudformation,
}) => {
  const pendingStates = [
    'CREATE_PENDING',
    'CREATE_IN_PROGRESS',
    'EXECUTE_IN_PROGRESS',
  ];

  const shouldExecuteState = 'CREATE_COMPLETE';
  const shouldNotExecuteState = 'FAILED';

  const data = await cloudformation
    .describeChangeSet({
      StackName: stack,
      ChangeSetName: changesetName,
    })
    .promise();

  if (data.Status === shouldExecuteState) {
    return true;
  } else if (data.Status === shouldNotExecuteState) {
    return false;
  } else if (pendingStates.includes(data.Status)) {
    await delay(3000);
    return shouldExecuteChangeset({
      stack,
      changesetName,
      cloudformation,
    });
  } else {
    throw new Error(
      `Invalid status for Changeset (${changesetName}). ${data.Status}`,
    );
  }
};
