import fs from 'node:fs';
import path from 'node:path';

import gitBranch from 'git-branch';

import { configSchema, envConfigSchema } from './schema';
import { formatValidationError, panic } from '../util/output.js';

/**
 * Merges and validates the user config with the default config. Panics if the
 * resulting config is not valid.
 */
export const loadConfigOrPanic = () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'),
  );

  const config = packageJson.deploy;

  if (!config)
    panic(
      'Could not find a `deploy` config inside your project’s package.json file',
      { label: 'Config not found' },
    );

  try {
    return configSchema.parse({
      name: packageJson.name,
      ...config,
    });
  } catch (error) {
    panic(
      `Your deploy config is invalid. See below for errors and hints for how to fix them.\n\n${formatValidationError(
        error,
      )}`,
      {
        label: 'Invalid deploy config',
      },
    );
  }
};

/**
 * Returns the config for the environment to deploy to by merging the default env
 * config with the user config.
 * Panics if the resulting config is not valid.
 */
export const getEnvConfig = (config, env) => {
  const envConfig = config.environments[env] || {};
  try {
    return envConfigSchema.parse(envConfig);
  } catch (error) {
    panic(formatValidationError(error));
  }
};

/**
 * Resolves the deployment target environment. It will either be the determined by
 * command line flag send in by the user, by the current git branch, or default to
 * production if it can't be determined.
 */
export const getEnvironment = (args) => {
  if (args.env) return args.env;
  try {
    const branch = gitBranch.sync();
    return branch === 'master' || branch === 'main' ? 'production' : branch;
  } catch (error) {
    return 'production';
  }
};
