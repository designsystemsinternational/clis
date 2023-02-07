import fs from 'node:fs';
import inquirer from 'inquirer';

import { prepareFunctionTemplate } from '../util/templates.js';
import { findLambdaFunctions, getFunctionConfigPath } from '../util/lambda.js';

import { withSpinner } from '../util/output.js';

// Inline works from the path of the rollup config 🤷🏻‍♂️
import lambdaTemplate from 'inline!./src/templates/lambda.js';

export default async function eject({ config }) {
  const lambdaFunctions = await findLambdaFunctions(config.functionsDir);
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

        // TODO: Find out the correct extension we need here.
        // if we're in a type module project js is fine. If we're in a
        // commonjs project we need to use mjs
        const configPath = getFunctionConfigPath(functionDefinition.file, 'js');

        fs.writeFileSync(configPath, lambdaTemplate);
        succeed();
      });
    },
  );
}
