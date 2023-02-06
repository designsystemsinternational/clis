import path from 'node:path';
import fs from 'node:fs';

import { rollup } from 'rollup';
import terser from '@rollup/plugin-terser';

import glob from 'glob';

const ALLOWED_EXTENSIONS = ['js', 'cjs', 'mjs'];

/**
 * Finds all Lambda function files in the given functions directory.
 */
export const findLambdaFunctions = (dir) => {
  const functionsGlob = path.join(
    process.cwd(),
    dir,
    '**',
    `*.{${ALLOWED_EXTENSIONS.join(',')}}`,
  );
  const functions = glob.sync(functionsGlob);

  return functions.map((file) => ({
    file,
    name: getFunctionName(file),
    config: resolveFunctionConfig(file),
  }));
};

/**
 * Gets a functions name based on its filename, this is used for the S3 Key as
 * well as for the route in the API Gateway.
 */
export const getFunctionName = (filename) => {
  for (const ext of ALLOWED_EXTENSIONS) {
    if (filename.endsWith(`.${ext}`)) {
      return path.basename(filename, `.${ext}`);
    }
  }

  return path.basename(filename);
};

/**
 * Turns a function into it's config name, to check if there is a user provided
 * config for this function.
 */
export const getFunctionConfigName = (filename) => {
  const name = getFunctionName(filename);
  return `${name}.config.json`;
};

/**
 * Checks if a function has a custom config and returns that config
 */
export const resolveFunctionConfig = (filename) => {
  const configName = getFunctionConfigName(filename);
  const configPath = path.join(path.dirname(filename), configName);
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  return null;
};

/**
 * Builds lambda functions using rollup
 */
export const buildAllLambdaFunctions = async (functions, config) => {
  const output = [];

  const buildLambdaFunction = async ({ file, externals = [] }) => {
    const bundle = await rollup({
      input: file,
      external: ['aws-sdk', ...externals],
      plugins: [],
    });

    const { output } = await bundle.generate({
      format: 'cjs',
      plugins: [terser()],
      exports: 'auto',
      sourcemap: false,
    });

    return output[0].code.replaceAll('"', "'").split('\n').join('');
  };

  for (const func of functions) {
    const code = await buildLambdaFunction({
      file: func.file,
      externals: config.functionsConfig.externalModules,
    });

    output.push({
      ...func,
      filename: path.basename(func.file),
      code,
    });
  }

  return output;
};
