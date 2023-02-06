import inquirer from 'inquirer';

import { getAWSWithProfile } from '@designsystemsinternational/cli-utils';
import { stackName } from '../constants.js';

import { formatAWSError, panic, withSpinner } from '../util/output.js';

import {
  shouldExecuteChangeset,
  newChangesetName,
  getStackParameters,
} from '../util/aws.js';

export default async function updateEnv({ config, env }) {
  const AWS = getAWSWithProfile(config.profile, config.region);
  const stack = stackName(config.name, env);
  const cloudformation = new AWS.CloudFormation();

  const { envVariables } = config.functionsConfig;

  if (envVariables.length === 0) {
    console.log('No env variables present. Exiting');
    process.exit();
  }

  const prompt = envVariables.map((variable) => {
    return {
      name: variable,
      type: 'input',
      message: `${variable} (leave empty to not overwrite)`,
      default: '',
    };
  });

  const answers = await inquirer.prompt(prompt);

  const updatedParams = Object.entries(answers)
    .map(([key, value]) => ({
      ParameterKey: key,
      ParameterValue: value,
    }))
    .filter((p) => p.ParameterValue !== '');

  if (updatedParams.length === 0) {
    console.log('No overwrites provided. Exiting');
    process.exit();
  }

  withSpinner(
    'Updating env variables for stack',
    async ({ succeed, fail, update }) => {
      let currentStackParameters;

      try {
        currentStackParameters = await getStackParameters({
          stack,
          cloudformation,
        });
      } catch (e) {
        fail();
        panic(formatAWSError(e), { label: 'AWS Error' });
      }

      const parameters = currentStackParameters.map((p) => {
        const key = p.ParameterKey;
        if (answers[key] && answers[key] !== '') {
          return {
            ParameterKey: key,
            ParameterValue: answers[key],
          };
        } else {
          return {
            ParameterKey: key,
            UsePreviousValue: true,
          };
        }
      });

      const changesetName = newChangesetName();

      try {
        await cloudformation
          .createChangeSet({
            UsePreviousTemplate: true,
            ChangeSetName: changesetName,
            StackName: stack,
            Parameters: parameters,
            Capabilities: ['CAPABILITY_NAMED_IAM'],
          })
          .promise();
      } catch (e) {
        fail();
        panic(formatAWSError(e), { label: 'AWS Error' });
      }

      const shouldExecute = await shouldExecuteChangeset({
        stack,
        changesetName,
        cloudformation,
      });

      if (shouldExecute) {
        update('Applying changeset to stack');

        try {
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

          succeed();
        } catch (e) {
          fail();
          panic(formatAWSError(e), { label: 'AWS Error' });
        }
      } else {
        update('No updated needed to stack');
        succeed();
      }
    },
  );
}
