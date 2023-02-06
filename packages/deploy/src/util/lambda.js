import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

import { rollup } from 'rollup';
import terser from '@rollup/plugin-terser';
import compressing from 'compressing';
import getStream from 'get-stream';

import glob from 'glob';

import { CACHE_FOLDER } from '../constants';
import { ensureCacheFolder } from './path';

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

export const getFunctionConfigPath = (filename) => {
  const configName = getFunctionConfigName(filename);
  const configPath = path.join(path.dirname(filename), configName);

  return configPath;
};

/**
 * Checks if a function has a custom config and returns that config
 */
export const resolveFunctionConfig = (filename) => {
  const configPath = getFunctionConfigPath(filename);
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  return null;
};

const createZipFileForLambdaFunction = async (code, name, filename) => {
  ensureCacheFolder();

  const zipStream = new compressing.zip.Stream();
  const hash = crypto.createHash('md5').update(code).digest('hex');
  const codeEntry = Buffer.from(code, 'utf8');

  // We save the file as index.js because that's what lambda is going to
  // assume to be the entry point.
  zipStream.addEntry(codeEntry, { relativePath: 'index.js' });

  const zipBuffer = await getStream.buffer(zipStream);
  const zipPath = path.join(process.cwd(), CACHE_FOLDER, `${name}.zip`);
  fs.writeFileSync(zipPath, zipBuffer);

  return {
    hash,
    zip: zipPath,
  };
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

    return output[0].code;
  };

  for (const func of functions) {
    const code = await buildLambdaFunction({
      file: func.file,
      externals: config.functionsConfig.externalModules,
    });

    const filename = path.basename(func.file);
    const zipFile = await createZipFileForLambdaFunction(
      code,
      func.name,
      filename,
    );

    output.push({
      ...func,
      zipFile,
      s3Key: `functions/${func.name}-${zipFile.hash}.zip`,
    });
  }

  return output;
};
