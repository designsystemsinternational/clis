import handlebars from 'handlebars';
import {
  bucketName,
  operationsBucketName,
  USE_PREVIOUS_VALUE,
} from '../constants';

import lambdaTemplate from '../templates/lambda.js';
import staticTemplate from '../templates/static.js';

import { getEnvConfig } from '../config/index.js';

/**
 * Renders a template through Handlebars and JSON parses the result.
 */
export const parseTemplate = (templateString, data) => {
  handlebars.registerHelper('uppercase', (str) => str.toUpperCase());
  const template = handlebars.compile(templateString);

  return JSON.parse(template(data));
};

export const mergeTemplates = (...templates) => {
  const keys = ['Parameters', 'Resources', 'Outputs'];
  const merged = {};
  for (const key of keys) {
    merged[key] = Object.assign({}, ...templates.map((t) => t[key] ?? {}));
  }

  return merged;
};

export const parametersToInquirer = ({
  params,
  opts = {},
  defaults = {},
  ignore = [],
}) => {
  const questions = [];
  Object.keys(params)
    .filter((key) => !ignore.includes(key))
    .forEach((key) => {
      const obj = params[key];
      questions.push({
        name: key,
        type: obj.AllowedValues ? 'list' : 'input',
        message: obj.Description ? `[${key}] ${obj.Description}` : key,
        default: opts.overrideDefault || obj.Default || defaults[key],
        choices: obj.AllowedValues
          ? opts.overrideDefault
            ? [opts.overrideDefault].concat(obj.AllowedValues)
            : obj.AllowedValues
          : null,
      });
    });
  return questions;
};

export const getParameterFromTemplate = (template, key) => {
  const param = template.parameters.find((p) => p.ParameterKey === key);
  return param ? param.ParameterValue : null;
};

export const prepareFunctionTemplate = (fn, config) => {
  const templateFn = fn.config ?? lambdaTemplate;

  console.log(templateFn, fn);

  return templateFn({
    config,
    functionDefinition: {
      name: fn.name,
      route: fn.route,
    },
  });
};

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

  const hasFunctions = functions.length > 0;

  const template = mergeTemplates(
    staticTemplate({
      config,
      environmentConfig: envConfig,
      environment: env,
      includesLambdaFunctions: hasFunctions,
    }),
    ...functions.map((func) => prepareFunctionTemplate(func, config)),
  );

  const existingEnvVariableNames = currentStackParameters;

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

  // Add any parameters that are defined in the environment config so we do not
  // need to prompt the user
  Object.entries(envConfig.parameters).forEach(([key, value]) => {
    if (!Object.keys(template.Parameters).includes(key)) {
      throw new Error(
        `Parameter ${key} is not defined in the template. Please add it to the template.`,
      );
    }

    autoParameters[key] = value;
  });

  autoParameters.environment = env;
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
