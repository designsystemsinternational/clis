import path from 'node:path';

import {
  getAWSWithProfile,
  uploadDirToS3,
} from '@designsystemsinternational/cli-utils';

import {
  createCloudFormationTemplate,
  prepareTemplateWithUserInput,
  createOrUpdateStack,
  getStackOutputs,
} from '../cloudformation/index.js';

import { getEnvConfig } from '../config/index.js';

import { stackName, operationsBucketName } from '../constants.js';

import { getParameterFromTemplate } from '../util/templates.js';
import {
  logStackFromTemplate,
  logTable,
  withSpinner,
  formatAWSError,
} from '../util/output.js';
import { confirmOrExit } from '../util/input.js';
import {
  findLambdaFunctions,
  buildAllLambdaFunctions,
} from '../util/lambda.js';

import { createBucketIfNonExisting, uploadFileToS3 } from '../util/aws.js';

export default async function deploy({ config, env }) {
  const AWS = getAWSWithProfile(config.profile, config.region);
  const envConfig = getEnvConfig(config, env);
  const stack = stackName(config.name, env);

  // Step 1: Run the build command on the static site (if configured)
  // ----------------------------------------------------------------
  if (config.shouldRunBuildCommand) {
    await withSpinner('Running build command', async ({ succeed }) => {
      // TODO
      succeed();
    });
  }

  // Step 2: Build and upload functions (if any)
  // ----------------------------------------------------------------
  let preparedFunctions = [];
  const lambdaFunctions = findLambdaFunctions(config.functionsDir);

  if (lambdaFunctions.length > 0) {
    await withSpinner('Building functions', async ({ succeed }) => {
      preparedFunctions = await buildAllLambdaFunctions(
        lambdaFunctions,
        config,
      );

      succeed();
    });
  }

  // Step 2: Build the CloudFormation template and gather user input (if needed)
  // --------------------------------------------------------------------------
  const compiledTemplate = createCloudFormationTemplate({
    config,
    env,
    functions: preparedFunctions,
  });

  console.log(
    `This operation will create or update your stack (${stack}) to contain the following resources`,
  );
  logStackFromTemplate(compiledTemplate.template);
  await confirmOrExit('Do you wish to continue?');

  const template = await prepareTemplateWithUserInput(compiledTemplate);

  // Step 3: Uploading Zipped functions to S3
  // ----------------------------------------------------------------
  if (preparedFunctions.length > 0) {
    await withSpinner(
      'Uploading functions to S3',
      async ({ succeed, update }) => {
        const operationsBucket = operationsBucketName(config.name);
        await createBucketIfNonExisting(operationsBucket, AWS);

        const totalFunctions = preparedFunctions.length;

        for (const [i, func] of preparedFunctions.entries()) {
          update(`Uploading ${i + 1} / ${totalFunctions}`);

          await uploadFileToS3({
            bucketName: operationsBucket,
            localFile: func.zipFile.zip,
            remoteFile: func.s3Key,
            AWS,
          });
        }

        succeed();
      },
    );
  }

  // Step 4: Create or update the CloudFormation stack
  // ----------------------------------------------------------------
  const cloudformation = new AWS.CloudFormation();

  await withSpinner(
    'Running CloudFormation',
    async ({ succeed, fail, update }) => {
      try {
        await createOrUpdateStack({
          cloudformation,
          stack,
          template,
          onProgress: (msg) => update(msg),
        });
        succeed();
      } catch (error) {
        fail();
        throw new Error(formatAWSError(error));
      }
    },
  );

  // Step 5: Upload the static site to S3
  // ----------------------------------------------------------------
  const s3Bucket = getParameterFromTemplate(template, 'S3BucketName');
  const buildDir = path.join(process.cwd(), config.buildDir);
  const { fileParameters } = envConfig;

  await withSpinner('Uploading Assets', async ({ succeed, fail, update }) => {
    try {
      await uploadDirToS3(AWS, buildDir, s3Bucket, fileParameters, {
        progress: (cur, total) => update(`Uploading ${cur}/${total}`),
        shouldUpload: (file) => path.extname(file) !== '.html',
      });
      succeed();
    } catch (error) {
      fail();
    }
  });

  await withSpinner('Uploading HTML', async ({ succeed, fail, update }) => {
    try {
      await uploadDirToS3(AWS, buildDir, s3Bucket, fileParameters, {
        progress: (cur, total) => update(`Uploading ${cur}/${total}`),
        shouldUpload: (file) => path.extname(file) === '.html',
      });
      succeed();
    } catch (error) {
      fail();
    }
  });

  // Step 6: Gather Stack outputs and print them to the user
  // ----------------------------------------------------------------
  await withSpinner('Finalizing Deployment', async ({ succeed }) => {
    const output = await getStackOutputs({
      cloudformation,
      stack,
    });

    succeed();

    logTable(
      ['Key', 'Value', 'Description'],
      output.map((o) => [o.OutputKey, o.OutputValue, o.Description]),
    );
  });
}
