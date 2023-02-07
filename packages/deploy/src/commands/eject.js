import fs from 'node:fs';
import inquirer from 'inquirer';

import { prepareFunctionTemplate } from '../util/templates.js';
import { findLambdaFunctions, getFunctionConfigPath } from '../util/lambda.js';

import { withSpinner } from '../util/output.js';

export default async function eject({ config }) {
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
