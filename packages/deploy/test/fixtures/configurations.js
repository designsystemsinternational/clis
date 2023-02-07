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

export const withDomain = configSchema.parse({
  name: TEST_NAME,
  profile: TEST_PROFILE,
  environments: {
    production: {
      useCustomDomain: true,
    },
  },
});

export const withEnvConfig = configSchema.parse({
  name: TEST_NAME,
  profile: TEST_PROFILE,
  environments: {
    production: {
      auth: true,
      parameters: {
        IndexPage: 'test',
        ErrorPage: 'test',
        AuthUsername: 'admin',
        AuthPassword: 'password',
      },
    },
  },
});

export const brokenEnvConfig = configSchema.parse({
  name: TEST_NAME,
  profile: TEST_PROFILE,
  environments: {
    production: {
      parameters: {
        nonExistentParam: 'test',
      },
    },
  },
});
