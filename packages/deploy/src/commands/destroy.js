import { bucketName, stackName } from '../constants.js';

import { confirmOrExit } from '../util/input.js';
import { formatAWSError, panic, withSpinner } from '../util/output.js';
import { getAWSWithProfile, emptyS3Bucket } from '../util/aws.js';

export default async function destory({ config, env }) {
  const AWS = getAWSWithProfile(config.profile, config.region);
  const stack = stackName(config.name, env);
  const cloudformation = new AWS.CloudFormation();

  await confirmOrExit(
    `Warning! This will permanently delete all files and resources in the ${stack} stack. Continue?`,
  );

  // Step 1: Empty S3 Bucket
  const bucket = bucketName(config.name, env);

  await withSpinner(
    `Deleting all files in bucket (${bucket})`,
    async ({ succeed, fail }) => {
      try {
        await emptyS3Bucket({
          bucketName: bucket,
          AWS,
        });

        succeed();
      } catch (e) {
        fail();
        panic(formatAWSError(e), { label: 'AWS Error' });
      }
    },
  );

  // Step 2: Delete Stack
  await withSpinner(
    `Deleting CloudFormation stack (${stack})`,
    async ({ succeed, fail }) => {
      try {
        await cloudformation.deleteStack({ StackName: stack }).promise();
        await cloudformation
          .waitFor('stackDeleteComplete', {
            StackName: stack,
          })
          .promise();

        succeed();
      } catch (e) {
        fail();
        panic(formatAWSError(e), { label: 'AWS Error' });
      }
    },
  );
}
