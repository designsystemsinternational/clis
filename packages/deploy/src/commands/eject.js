import fs from 'node:fs';
import inquirer from 'inquirer';

import { findLambdaFunctions, getFunctionConfigPath } from '../util/lambda.js';
import { maybeImportUserTemplate } from '../util/misc.js';

import { withSpinner } from '../util/output.js';

// Inline works from the path of the rollup config 🤷🏻‍♂️
import lambdaTemplate from 'inline!./src/templates/lambda.js';
import stackTemplate from 'inline!./src/templates/static.js';
import { getUserTemplatePath } from '../util/templates.js';

export default async function eject({ config }) {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'What do you want to eject?',
      choices: [
        {
          name: 'Stack Template',
          value: 'static',
        },
        {
          name: 'Lambda function template',
          value: 'lambda',
        },
      ],
    },
  ]);

  if (answers.type === 'static') {
    ejectStaticTemplate({ config });
  }

  if (answers.type === 'lambda') {
    ejectLambda({ config });
  }
}

export const ejectStaticTemplate = async ({ config }) => {
  const userTemplatePath = getUserTemplatePath();
  const userTemplate = await maybeImportUserTemplate(userTemplatePath);
  const userTemplateExists = !!userTemplate;

  if (userTemplateExists) {
    console.log('User template already exists, skipping');
    process.exit();
  }

  await withSpinner('Writing template', async ({ succeed }) => {
    const writeTemplatePath = getUserTemplatePath('js');
    fs.writeFileSync(writeTemplatePath, stackTemplate);
    succeed();
  });
};

export const ejectLambda = async ({ config }) => {
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
};
