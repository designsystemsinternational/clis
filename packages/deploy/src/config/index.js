import fs from 'node:fs';
import path from 'node:path';

import gitBranch from 'git-branch';
import slugify from 'slugify';

import { configSchema, envConfigSchema } from './schema';
import { formatValidationError, panic } from '../util/output.js';

export const validateConfig = (config) => {
  try {
    return { valid: true, config: configSchema.parse(config) };
  } catch (error) {
    return { valid: false, errors: formatValidationError(error) };
  }
};

export const validateEnvConfig = (config) => {
  try {
    return { valid: true, config: envConfigSchema.parse(config) };
  } catch (error) {
    return { valid: false, errors: formatValidationError(error) };
  }
};

/**
 * Merges and validates the user config with the default config. Panics if the
 * resulting config is not valid.
 */
export const loadConfigOrPanic = () => {
  const { config, packageJson } = readConfig();

  const validation = validateConfig({
    name: formatProjectName(packageJson.name),
    ...(config || {}),
  });

  if (!validation.valid)
    panic(
      `Your deploy config is invalid. See below for errors and hints for how to fix them.\n\n${validation.errors}`,
      { label: 'Invalid deploy config' },
    );

  return validation.config;
};

export const readConfig = () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'),
  );

  return { config: packageJson.deploy, packageJson };
};

export const formatProjectName = (name) => {
  return slugify(name, {
    lower: true,
    strict: true,
    replacement: '-',
  });
};

export const getProjectName = () => {
  const { packageJson } = readConfig();
  return formatProjectName(packageJson.name);
};

export const hasConfig = () => {
  const { config } = readConfig();
  return !!config;
};

export const mergeConfig = (pkg, userConfig) => {
  return {
    ...pkg,
    deploy: {
      ...pkg.deploy,
      ...userConfig,
    },
  };
};

export const mergeEnvironmentConfig = (pkg, env, userConfig) => {
  return {
    ...pkg,
    deploy: {
      ...pkg.deploy,
      environments: {
        ...pkg.deploy.environments,
        [env]: {
          ...userConfig,
        },
      },
    },
  };
};

export const writeConfig = (config) => {
  fs.writeFileSync(
    path.join(process.cwd(), 'package.json'),
    JSON.stringify(config, null, 2),
  );
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
