import { configSchema } from '../../src/config/schema';

export const TEST_NAME = 'test';
export const TEST_PROFILE = 'TEST';
export const TEST_ENV_VARS = ['myVar1', 'myVar2'];

export const simpleConfig = configSchema.parse({
  name: TEST_NAME,
  profile: TEST_PROFILE,
});

export const withEnvVariables = configSchema.parse({
  name: TEST_NAME,
  profile: TEST_PROFILE,
  functionsConfig: {
    envVariables: TEST_ENV_VARS,
  },
});

export const withAuth = configSchema.parse({
  name: TEST_NAME,
  profile: TEST_PROFILE,
  environments: {
    production: {
      auth: true,
    },
  },
});

export const withEnvConfig = configSchema.parse({
  name: TEST_NAME,
  profile: TEST_PROFILE,
  environments: {
    production: {
      indexPage: 'test',
      errorPage: 'test',
    },
  },
});
