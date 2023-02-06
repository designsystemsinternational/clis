import inquirer from 'inquirer';

import { getEnvConfig } from '../config/index.js';
import { mergeTemplates, parametersToInquirer } from '../util/templates.js';

import s3ConfigTemplate from './templates/s3static.template.hbs';
import cloudfrontTemplate from './templates/cloudfront.template.hbs';
import lambdaFunctionTemplate from './templates/lambda.template.hbs';
import apiGatewayConfigTemplate from './templates/apiGateway.template.hbs';
import authConfigTemplate from './templates/auth.template.hbs';

import { bucketName } from '../util/names.js';
import { parseTemplate } from '../util/templates.js';

/**
 * Takes in a validated configuration and turns it into a CloudFormation template.
 */
export function createCloudFormationTemplate({ config, env, functions = [] }) {
  const envConfig = getEnvConfig(config, env);

  const shouldUseAuth = !!envConfig.auth;
  const hasFunctions = functions.length > 0;

  const functionTemplates = functions.map((func) =>
    prepareFunctionTemplate(func, config),
  );

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

  // Build the prompt to gather missing information from the user
  const prompt = parametersToInquirer({
    params: template.Parameters,
    defaults: {
      S3BucketName: bucketName(config.name, env),
    },
    // TODO: Refactor this to auto parameter
    ignore: [shouldUseAuth && ['AuthUsername', 'AuthPassword']].flat(),
  });

  // Add additional parameters that do not need to be added by the user
  template.Parameters.environment = {
    Description: 'The environment name based on Git Branch or CLI flag',
    Type: 'String',
  };

  return {
    prompt,
    autoParameters: {
      environment: env,
      ...(shouldUseAuth && {
        AuthUsername: envConfig.auth.username,
        AuthPassword: envConfig.auth.password,
      }),
    },
    template,
  };
}

export const prepareFunctionTemplate = (fn, config) => {
  return parseTemplate(lambdaFunctionTemplate, {
    name: fn.name,
    config,
    route: fn.name,
    httpVerbs: ['Get', 'Post', 'Put', 'Delete'],
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
  let parameters = {};

  if (prompt.length > 0) {
    const answers = await inquirer.prompt(prompt);
    parameters = Object.keys(answers).map((key) => ({
      ParameterKey: key,
      ParameterValue: answers[key],
    }));
  }

  if (autoParameters) {
    Object.keys(autoParameters).forEach((key) => {
      parameters.push({
        ParameterKey: key,
        ParameterValue: autoParameters[key],
      });
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
}) => {
  const stacks = await cloudformation.listStacks().promise();
  const stackExists = stacks.StackSummaries.some(
    (s) => s.StackName === stack && s.StackStatus !== 'DELETE_COMPLETE',
  );

  if (stackExists) {
    try {
      // TODO: This should probably be handled by a changeset
      await cloudformation
        .updateStack({
          StackName: stack,
          TemplateBody: JSON.stringify(template.template),
          Parameters: template.parameters,
          Capabilities: ['CAPABILITY_NAMED_IAM'],
        })
        .promise();

      await cloudformation
        .waitFor('stackUpdateComplete', {
          StackName: stack,
        })
        .promise();
    } catch (error) {
      console.log(error);
    }
  } else {
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
