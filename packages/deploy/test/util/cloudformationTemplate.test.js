import { vi, describe, it, expect } from 'vitest';
import {
  simpleConfig,
  withAuth,
  withEnvVariables,
  withEnvConfig,
  brokenEnvConfig,
  TEST_ENV_VARS,
} from '../fixtures/configurations';

import { createCloudFormationTemplate } from '../../src/util/templates.js';
import {
  expectTemplateToHaveResources,
  expectTemplateNotToHaveResources,
  expectTemplateToHaveParameters,
  expectTemplateNotToHaveParameters,
  expectPromptToHaveKey,
  expectPromptNotToHaveKey,
} from '../testUtils/index.js';

describe('createCloudFormationTemplate', () => {
  it('should by default only output the config to setup S3 and CloudFormation', () => {
    const { template } = createCloudFormationTemplate({
      config: simpleConfig,
      env: 'production',
    });

    expectTemplateToHaveResources(
      template,
      'S3Bucket',
      'CloudfrontDistribution',
    );

    expectTemplateNotToHaveResources(template, 'AuthLambda', 'api', 'stage');

    expectTemplateToHaveParameters(
      template,
      'IndexPage',
      'ErrorPage',
      'environment',
      'S3BucketName',
    );
  });

  it('should add auth resources if auth is specified for the current environment', () => {
    const { template } = createCloudFormationTemplate({
      config: withAuth,
      env: 'production',
    });

    expectTemplateToHaveResources(
      template,
      'AuthLambdaRole',
      'AuthLambda',
      'VersionedAuthLambda',
      'AuthLambdaLogGroup',
    );

    expectTemplateToHaveParameters(template, 'AuthUsername', 'AuthPassword');
  });

  it('should add any env variables as parameters to the template', () => {
    const { template } = createCloudFormationTemplate({
      config: withEnvVariables,
      env: 'production',
    });

    expectTemplateToHaveParameters(template, ...TEST_ENV_VARS);
  });

  it('should add lambda resources according to the default lambda template if a function is added to be deployed', () => {
    const { template } = createCloudFormationTemplate({
      config: simpleConfig,
      functions: [
        {
          file: './my/sample.js',
          name: 'sample',
          route: 'sample',
          config: null,
        },
      ],
    });

    expectTemplateToHaveResources(
      template,
      'api',
      'stage',
      'stageLogGroup',
      'sampleLambdaRole',
      'sampleLambda',
      'samplePermission',
      'sampleIntegration',
      'sampleGetRoute',
      'samplePostRoute',
      'samplePutRoute',
      'sampleDeleteRoute',
    );
  });

  it('should use user template for lambda function is provided', () => {
    const configFn = vi.fn().mockReturnValue({
      Resources: {
        TEST_RESOURCE: {},
      },
    });

    const { template } = createCloudFormationTemplate({
      config: simpleConfig,
      functions: [
        {
          file: './my/sample.js',
          name: 'sample',
          config: configFn,
        },
      ],
    });

    expect(configFn).toHaveBeenCalled();

    expectTemplateToHaveResources(
      template,
      'S3Bucket',
      'CloudfrontDistribution',
      'api',
      'stage',
      'stageLogGroup',
      'TEST_RESOURCE',
    );
  });

  it('should return a user prompt for parameters it cannot derive', () => {
    const { prompt } = createCloudFormationTemplate({
      config: withAuth,
      env: 'production',
    });

    expectPromptToHaveKey(prompt, 'IndexPage');
    expectPromptToHaveKey(prompt, 'ErrorPage');
    expectPromptToHaveKey(prompt, 'AuthUsername');
    expectPromptToHaveKey(prompt, 'AuthPassword');
  });

  it('should return a user prompt for parameters it cannot derive', () => {
    const { prompt } = createCloudFormationTemplate({
      config: withEnvConfig,
      env: 'production',
    });

    expectPromptNotToHaveKey(prompt, 'IndexPage');
    expectPromptNotToHaveKey(prompt, 'ErrorPage');
  });

  it('should throw if a parameter is added to the environment that’s not defined in the template', () => {
    expect(() => {
      createCloudFormationTemplate({
        config: brokenEnvConfig,
        env: 'production',
      });
    }).toThrow();
  });

  it('should add any defined env variables to the prompt', () => {
    const { prompt } = createCloudFormationTemplate({
      config: withEnvVariables,
      env: 'production',
    });

    TEST_ENV_VARS.forEach((testVar) => expectPromptToHaveKey(prompt, testVar));
  });

  it('should not add env variables to the prompt that are already defined on the stack', () => {
    const { prompt } = createCloudFormationTemplate({
      config: withEnvVariables,
      env: 'production',
      currentStackParameters: [TEST_ENV_VARS[0]],
    });

    expectPromptNotToHaveKey(prompt, TEST_ENV_VARS[0]);
    expectPromptToHaveKey(prompt, TEST_ENV_VARS[1]);
  });
});
