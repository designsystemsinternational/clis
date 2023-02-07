import { getAWSWithProfile } from '../util/aws.js';
import { stackName } from '../constants.js';

import {
  formatAWSError,
  logTable,
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
        logTable(
          ['Type', 'URL'],
          details.Outputs.map((o) => [o.OutputKey, o.OutputValue]),
          false,
        );
        console.log('');
        console.log('Stack Parameters');
        logTable(
          ['Name', 'Value'],
          details.Parameters.map((o) => [o.ParameterKey, o.ParameterValue]),
          false,
        );
      } catch (e) {
        fail();
        panic(formatAWSError(e), { label: 'AWS Error' });
      }
    },
  );
}
