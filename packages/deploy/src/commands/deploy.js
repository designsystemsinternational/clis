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

import { validateCloudFormationTemplate } from '../util/aws.js';
import { getParameterFromTemplate } from '../util/templates.js';
import { stackName } from '../util/names.js';
import { withSpinner, formatAWSError } from '../util/output.js';
import {
  findLambdaFunctions,
  buildAllLambdaFunctions,
} from '../util/lambda.js';

export default async function deploy(config, env) {
  const AWS = getAWSWithProfile(config.profile, config.region);
  const envConfig = getEnvConfig(config, env);

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

  // Step 3: Build the CloudFormation template
  // ----------------------------------------------------------------
  const template = await prepareTemplateWithUserInput(
    createCloudFormationTemplate({ config, env, functions: preparedFunctions }),
  );

  // Step 4: Create or update the CloudFormation stack
  // ----------------------------------------------------------------
  const stack = stackName(config.name, env);
  const cloudformation = new AWS.CloudFormation();

  const valid = await validateCloudFormationTemplate(template.template);
  console.log(valid);
  process.exit();

  await withSpinner(
    'Creating CloudFormation stack',
    async ({ succeed, fail }) => {
      try {
        await createOrUpdateStack({
          cloudformation,
          stack,
          template,
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

    console.log(output);
  });
}
