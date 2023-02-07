import handlebars from 'handlebars';
import {
  bucketName,
  operationsBucketName,
  DEFAULT_HTTP_VERBS,
  USE_PREVIOUS_VALUE,
} from '../constants';

import s3ConfigTemplate from '../templates/s3static.template.hbs';
import cloudfrontTemplate from '../templates/cloudfront.template.hbs';
import apiGatewayConfigTemplate from '../templates/apiGateway.template.hbs';
import authConfigTemplate from '../templates/auth.template.hbs';
import lambdaFunctionTemplate from '../templates/lambda.template.hbs';

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
  return parseTemplate(lambdaFunctionTemplate, {
    name: fn.name,
    config,
    route: fn.name,
    httpVerbs: DEFAULT_HTTP_VERBS,
    code: fn.code,
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
