import fs from 'node:fs';
import inquirer from 'inquirer';

import { getAWSWithProfile } from '@designsystemsinternational/cli-utils';

import { stackName } from '../constants.js';

import { prepareFunctionTemplate } from '../cloudformation/index.js';
import { findLambdaFunctions, getFunctionConfigPath } from '../util/lambda.js';

import {
  formatAWSError,
  logTable,
  panic,
  withSpinner,
} from '../util/output.js';

export default async function eject({ config, env }) {
  const lambdaFunctions = findLambdaFunctions(config.functionsDir);
  const choices = lambdaFunctions.filter((f) => f.config === null);

  if (choices.length === 0) {
    console.log('Nothing to eject');
    process.exit();
  }

  const answers = await inquirer.prompt([
    {
      name: 'functions',
      type: 'checkbox',
      message: 'Which functions do you wish to eject?',
      choices,
    },
  ]);

  await withSpinner(
    'Ejecting configuration for selected functions',
    async ({ succeed }) => {
      answers.functions.forEach((func) => {
        const functionDefinition = lambdaFunctions.find((f) => f.name === func);
        const configPath = getFunctionConfigPath(functionDefinition.file);
        const template = prepareFunctionTemplate(functionDefinition, config);

        fs.writeFileSync(configPath, JSON.stringify(template, null, 2));
        succeed();
      });
    },
  );
}
