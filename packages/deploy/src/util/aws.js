import fs from 'node:fs';

import AWS from 'aws-sdk';
import s3 from '@auth0/s3';
import inquirer from 'inquirer';
import micromatch from 'micromatch';

import { USE_PREVIOUS_VALUE } from '../constants.js';

import { delay } from './misc';

export const getAWSWithProfile = (profile, region) => {
  const opts = { region };
  if (profile && profile !== 'none') {
    opts.credentials = new AWS.SharedIniFileCredentials({ profile });
  }
  AWS.config.update(opts);
  return AWS;
};

export const awsRegions = {
  'us-east-1': 'us-east-1 (N. Virginia)',
  'us-east-2': 'us-east-2 (Ohio)',
  'us-west-1': 'us-west-1 (N. California)',
  'us-west-2': 'us-west-2 (Oregon)',
  'ap-south-1': 'ap-south-1 (Mumbai)',
  'ap-northeast-1': 'ap-northeast-1 (Tokyo)',
  'ap-northeast-2': 'ap-northeast-2 (Seoul)',
  'ap-northeast-3': 'ap-northeast-3 (Osaka)',
  'ap-southeast-1': 'ap-southeast-1 (Singapore)',
  'ap-southeast-2': 'ap-southeast-2 (Sydney)',
  'ca-central-1': 'ca-central-1 (Canada)',
  'cn-north-1': 'cn-north-1 (Beijing)',
  'cn-northwest-1': 'cn-northwest-1 (Ningxia)',
  'eu-central-1': 'eu-central-1 (Frankfurt)',
  'eu-west-1': 'eu-west-1 (Ireland)',
  'eu-west-2': 'eu-west-2 (London)',
  'eu-west-3': 'eu-west-3 (Paris)',
  'eu-north-1': 'eu-north-1 (Stockholm)',
  'sa-east-1': 'sa-east-1 (São Paulo)',
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

/**
 * A function to upload an entire directory to S3, syncing HTML files last.
 * fileParams allows you to specify S3 params for certain files:
 * fileParams = [
 *   { match: '*.json', params: { CacheControl: 'public' } }
 *   { match: '*.html', params: { CacheControl: 'max-age=500' } }
 * ]
 */
export const uploadDirToS3 = async (
  AWS,
  localDir,
  bucket,
  fileParams,
  callbacks = {},
) =>
  new Promise((resolve, reject) => {
    const getS3Params = (localFile, stat, callback) => {
      const params = {
        ACL: 'public-read',
        CacheControl: 'no-store',
      };

      if (Array.isArray(fileParams)) {
        const file = fileParams.find((p) =>
          micromatch.isMatch(localFile, p.match),
        );
        if (file && file.params) {
          Object.assign(params, file.params);
        }
      }

      if (callbacks.shouldUpload && !callbacks.shouldUpload(localFile)) {
        callback(null, null);
      } else {
        callback(null, params);
      }
    };

    const s3Client = new AWS.S3();
    const client = s3.createClient({ s3Client });

    const uploader = client.uploadDir({
      localDir,
      getS3Params,
      s3Params: { Bucket: bucket, Prefix: '' },
    });

    uploader.on('error', (err) => {
      reject(err.stack);
    });

    if (callbacks.progress) {
      uploader.on('progress', () =>
        callbacks.progress(uploader.progressAmount, uploader.progressTotal),
      );
    }

    if (callbacks.fileUploadStart) {
      uploader.on('fileUploadStart', callbacks.fileUploadStart);
    }

    if (callbacks.fileUploadEnd) {
      uploader.on('fileUploadEnd', callbacks.fileUploadEnd);
    }

    uploader.on('end', () => {
      resolve();
    });
  });

export const emptyS3Bucket = async ({ bucketName, AWS }) => {
  const s3 = new AWS.S3();

  const objects = await s3.listObjectsV2({ Bucket: bucketName }).promise();
  if (objects.Contents.length === 0) return;

  await s3
    .deleteObjects({
      Bucket: bucketName,
      Delete: { Objects: objects.Contents.map(({ Key }) => ({ Key })) },
    })
    .promise();

  if (objects.IsTruncated) await emptyS3Bucket({ bucketName, AWS });
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

export const stackExists = async ({ stack, cloudformation }) => {
  const stacks = await cloudformation.listStacks().promise();
  const exists = stacks.StackSummaries.some(
    (s) => s.StackName === stack && s.StackStatus !== 'DELETE_COMPLETE',
  );

  return exists;
};

export const getStackParameters = async ({ stack, cloudformation }) => {
  const hasStack = await stackExists({ stack, cloudformation });
  if (!hasStack) return [];

  const stacks = await cloudformation
    .describeStacks({ StackName: stack })
    .promise();
  const details = stacks.Stacks[0];

  return details.Parameters;
};

/**
 * Abstraction to create or update a cloudformation stack.
 */
export const createOrUpdateStack = async ({
  cloudformation,
  stack,
  template,
  onProgress = () => {},
}) => {
  const stacks = await cloudformation.listStacks().promise();
  const stackExists = stacks.StackSummaries.some(
    (s) => s.StackName === stack && s.StackStatus !== 'DELETE_COMPLETE',
  );

  if (stackExists) {
    const changesetName = newChangesetName();
    onProgress('Stack exists. Check if it needs to be updated');

    await cloudformation
      .createChangeSet({
        UsePreviousTemplate: false,
        ChangeSetName: changesetName,
        StackName: stack,
        TemplateBody: JSON.stringify(template.template),
        Parameters: template.parameters,
        Capabilities: ['CAPABILITY_NAMED_IAM'],
      })
      .promise();

    const shouldExecute = await shouldExecuteChangeset({
      stack,
      changesetName,
      cloudformation,
    });

    if (shouldExecute) {
      onProgress('Performing Stack Update');
      await cloudformation
        .executeChangeSet({
          StackName: stack,
          ChangeSetName: changesetName,
        })
        .promise();

      await cloudformation
        .waitFor('stackUpdateComplete', {
          StackName: stack,
        })
        .promise();
    } else {
      onProgress('No update needed');
    }
  } else {
    onProgress('Creating Stack');
    await cloudformation
      .createStack({
        StackName: stack,
        TemplateBody: JSON.stringify(template.template),
        Parameters: template.parameters,
        Capabilities: ['CAPABILITY_NAMED_IAM'],
      })
      .promise();

    await cloudformation
      .waitFor('stackCreateComplete', {
        StackName: stack,
      })
      .promise();
  }
};

export const getStackOutputs = async ({ cloudformation, stack }) => {
  const stackDetails = await cloudformation
    .describeStacks({ StackName: stack })
    .promise();

  return stackDetails.Stacks[0]?.Outputs ?? [];
};

/**
 * Gathers user input (if needed) via Inquirer.
 */
export const prepareTemplateWithUserInput = async ({
  template,
  prompt,
  autoParameters,
}) => {
  let parameters = [];

  if (prompt.length > 0) {
    const answers = await inquirer.prompt(prompt);
    parameters = Object.keys(answers).map((key) => ({
      ParameterKey: key,
      ParameterValue: answers[key],
    }));
  }

  if (autoParameters) {
    Object.keys(autoParameters).forEach((key) => {
      if (autoParameters[key] === USE_PREVIOUS_VALUE) {
        parameters.push({
          ParameterKey: key,
          UsePreviousValue: true,
        });
      } else {
        parameters.push({
          ParameterKey: key,
          ParameterValue: autoParameters[key],
        });
      }
    });
  }

  return {
    parameters,
    template,
  };
};
