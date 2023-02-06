import inquirer from 'inquirer';

import { getEnvConfig } from '../config/index.js';
import { mergeTemplates, parametersToInquirer } from '../util/templates.js';

import s3ConfigTemplate from './templates/s3static.template.hbs';
import cloudfrontTemplate from './templates/cloudfront.template.hbs';
import lambdaFunctionTemplate from './templates/lambda.template.hbs';
import apiGatewayConfigTemplate from './templates/apiGateway.template.hbs';
import authConfigTemplate from './templates/auth.template.hbs';

import {
  bucketName,
  operationsBucketName,
  DEFAULT_HTTP_VERBS,
  USE_PREVIOUS_VALUE,
} from '../constants.js';
import { parseTemplate } from '../util/templates.js';
import { newChangesetName, shouldExecuteChangeset } from '../util/aws.js';

/**
 * Takes in a validated configuration and turns it into a CloudFormation template.
 */
export function createCloudFormationTemplate({
  config,
  env,
  functions = [],
  currentStackParameters = [],
}) {
  const envConfig = getEnvConfig(config, env);

  const shouldUseAuth = !!envConfig.auth;
  const hasFunctions = functions.length > 0;

  const functionTemplates = functions.map((func) => {
    return func.config ?? prepareFunctionTemplate(func, config);
  });

  const sourceTemplates = [
    parseTemplate(s3ConfigTemplate),
    parseTemplate(cloudfrontTemplate, {
      config,
      environment: envConfig,
    }),
    hasFunctions && parseTemplate(apiGatewayConfigTemplate),
    hasFunctions && functionTemplates,
    shouldUseAuth && parseTemplate(authConfigTemplate),
  ]
    .filter(Boolean)
    .flat();

  const template = mergeTemplates(...sourceTemplates);

  const existingEnvVariableNames = currentStackParameters.map(
    (p) => p.ParameterKey,
  );

  // Set up the parameters needed for the CloudFormation template. The goal
  // is to gather as much of the needed information from the configuration and
  // only prompt the user to fill in missing details.
  const autoParameters = {};
  const { envVariables } = config.functionsConfig;

  // Add Environment Variables to the template Parameters
  envVariables.forEach((variable) => {
    // If a variable is already set on a stack do not ask it again
    template.Parameters[variable] = {
      Description: `Env variable for lambda functions (${variable})`,
      Type: 'String',
    };

    if (existingEnvVariableNames.includes(variable)) {
      autoParameters[variable] = USE_PREVIOUS_VALUE;
    }
  });

  if (envConfig.indexPage) autoParameters.IndexPage = envConfig.indexPage;
  if (envConfig.errorPage) autoParameters.ErrorPage = envConfig.errorPage;

  template.Parameters.environment = {
    Description: 'The environment name based on Git Branch or CLI flag',
    Type: 'String',
  };
  autoParameters.environment = env;

  template.Parameters.S3BucketName = {
    Description: 'Name of the S3 bucket.',
    Type: 'String',
  };
  autoParameters.S3BucketName = bucketName(config.name, env);

  if (hasFunctions) {
    template.Parameters.operationsS3Bucket = {
      Description: 'Bucket that holds the zipped lambda functions',
      Type: 'String',
    };

    autoParameters.operationsS3Bucket = operationsBucketName(config.name);

    for (const func of functions) {
      const paramName = `${func.name}S3Key`;
      template.Parameters[paramName] = {
        Description: `S3Key to find the zip file for the ${func.name} function`,
        Type: 'String',
      };

      autoParameters[paramName] = func.s3Key;
    }
  }

  // Build the prompt to gather missing information from the user
  const prompt = parametersToInquirer({
    params: template.Parameters,
    ignore: Object.keys(autoParameters),
  });

  return {
    prompt,
    autoParameters,
    template,
  };
}

export const prepareFunctionTemplate = (fn, config) => {
  return parseTemplate(lambdaFunctionTemplate, {
    name: fn.name,
    config,
    route: fn.name,
    httpVerbs: DEFAULT_HTTP_VERBS,
    code: fn.code,
  });
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
