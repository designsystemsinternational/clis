import { getAWSWithProfile } from '../util/aws.js';
import { stackName } from '../constants.js';

import {
  formatAWSError,
  logOutputs,
  panic,
  withSpinner,
} from '../util/output.js';

export default async function show({ config, env }) {
  const AWS = getAWSWithProfile(config.profile, config.region);
  const stack = stackName(config.name, env);

  const cloudformation = new AWS.CloudFormation();
  await withSpinner(
    `Retrieving stack information (${stack})`,
    async ({ succeed, fail }) => {
      try {
        const response = await cloudformation
          .describeStacks({ StackName: stack })
          .promise();

        const details = response.Stacks[0];

        succeed();

        console.log('Stack Outputs');
        logOutputs(details.Outputs);
      } catch (e) {
        fail();
        panic(formatAWSError(e), { label: 'AWS Error' });
      }
    },
  );
}
