import inquirer from 'inquirer';

import { getProjectName, validateEnvConfig } from '../config/index.js';

import { withSpinner } from '../util/output.js';
import { confirmOrExit } from '../util/input.js';
import { panic } from '../util/output.js';
import { awsRegions } from '../util/aws.js';

import {
  DEFAULT_BUILD_DIR,
  DEFAULT_BUILD_COMMAND,
  DEFAULT_FUNCTIONS_DIR,
} from '../config/schema.js';

import {
  readConfig,
  validateConfig,
  mergeConfig,
  mergeEnvironmentConfig,
  writeConfig,
} from '../config/index.js';

export default async function init({ config, env }) {
  if (config === null) {
    // 1 If there is no config we need to initialize an entire deploy project
    // ----------------------------------------------------------------------
    console.log('Initializing deploy project');
    await initializeProject({ defaultName: getProjectName() });
  } else {
    // 2 If there is a config we want to initialize the environment
    // ----------------------------------------------------------------------

    // However, if the config already has a configuration for the current environment
    // we want to ask the user if it's ok to overwrite.
    if (!!config.environments[env]) {
      await confirmOrExit(
        `This will create an environment config for ${env}. You already have defined a config for ${env}. Do you want to overwrite it?`,
      );
    }

    await initializeEnvironment({ env });
  }
}

const initializeProject = async ({ defaultName = '' } = {}) => {
  const prompt = [
    {
      type: 'input',
      name: 'name',
      message: 'What is the name of your project?',
      default: defaultName,
    },
    {
      type: 'input',
      name: 'profile',
      message: 'Which AWS profile do you want to use?',
      default: 'default',
    },
    {
      type: 'list',
      name: 'region',
      message: 'Which AWS region do you want to use?',
      choices: Object.keys(awsRegions),
      default: 'us-east-1',
    },
    {
      type: 'input',
      name: 'buildDir',
      message: 'What’s the build directory of your project?',
      default: DEFAULT_BUILD_DIR,
    },
    {
      type: 'confirm',
      name: 'shouldRunBuildCommand',
      message: 'Should deploy run the build command before deploying?',
      default: true,
    },
    {
      type: 'input',
      name: 'buildCommand',
      message: 'What’s the build command?',
      default: DEFAULT_BUILD_COMMAND,
      when: (answers) => answers.shouldRunBuildCommand,
    },
    {
      type: 'input',
      name: 'functionsDir',
      message: 'What’s the functions directory of your project?',
      default: DEFAULT_FUNCTIONS_DIR,
    },
  ];

  const answers = await inquirer.prompt(prompt);
  const validation = validateConfig(answers);

  if (!validation.valid)
    panic(
      `Your deploy configuration is invalid. See below for details.\n\n${validation.errors}`,
      { label: 'Invalid config' },
    );

  console.log(
    'This will now create the following config and add it to your project’s package.json file',
  );
  console.log(JSON.stringify(answers, null, 2));

  await confirmOrExit('Do you want to continue?');

  await withSpinner('Updating package.json', async ({ succeed }) => {
    const { packageJson } = readConfig();
    const config = mergeConfig(packageJson, answers);
    writeConfig(config);
    succeed();
  });
};

const initializeEnvironment = async ({ env }) => {
  const prompt = [
    {
      type: 'confirm',
      name: 'useCloudfront',
      message:
        'Do you want to set up a CloudFront distribution for this environment?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'auth',
      message: 'Do you want to enable authentication?',
      default: false,
      when: (answers) => answers.useCloudfront,
    },
    {
      type: 'confirm',
      name: 'useCustomDomain',
      message: 'Do you want to use a custom domain?',
      default: false,
      when: (answers) => answers.useCloudfront,
    },
    {
      type: 'input',
      name: 'domain',
      message: 'What is your custom domain? (domain.tld)',
      when: (answers) => answers.useCustomDomain,
    },
    {
      type: 'input',
      name: 'hosedZoneID',
      message: 'What is your Route 53 hosted zone ID for the domain?',
      when: (answers) => answers.useCustomDomain,
    },
    {
      type: 'input',
      name: 'indexPage',
      message: 'What’s the index page of your project?',
      default: 'index.html',
    },
    {
      type: 'input',
      name: 'errorPage',
      message: 'What’s the error page of your project?',
      default: 'error.html',
    },
  ];

  const answers = await inquirer.prompt(prompt);

  const configFromAnswers = {
    ...(answers.useCloudfront
      ? {
          auth: answers.auth,
          useCustomDomain: answers.useCustomDomain,
        }
      : {
          skipCloudfront: true,
        }),
    parameters: {
      ...(answers.useCustomDomain && { Domain: answers.domain }),
      ...(answers.useCustomDomain && { HostedZoneID: answers.hosedZoneID }),
      IndexPage: answers.indexPage,
      ErrorPage: answers.errorPage,
    },
  };

  const validation = validateEnvConfig(configFromAnswers);

  if (!validation.valid)
    panic(
      `Your environment configuration is invalid. See below for details.\n\n${validation.errors}`,
      { label: 'Invalid config' },
    );

  console.log(`This will set the config for the ${env} environment`);
  console.log(JSON.stringify(configFromAnswers, null, 2));

  await confirmOrExit('Do you want to continue?');

  await withSpinner('Updating package.json', async ({ succeed }) => {
    const { packageJson } = readConfig();
    const config = mergeEnvironmentConfig(packageJson, env, configFromAnswers);
    writeConfig(config);
    succeed();
  });
};
