import path from 'node:path';
import { execa } from 'execa';

import { getEnvConfig } from '../config/index.js';

import { stackName, operationsBucketName } from '../constants.js';

import {
  getUserTemplatePath,
  createCloudFormationTemplate,
  getParameterFromTemplate,
} from '../util/templates.js';

import { maybeImportUserTemplate } from '../util/misc.js';

import {
  logChanges,
  logOutputs,
  withSpinner,
  formatAWSError,
  panic,
} from '../util/output.js';

import { confirmOrExit } from '../util/input.js';

import {
  findLambdaFunctions,
  buildAllLambdaFunctions,
} from '../util/lambda.js';

import {
  getAWSWithProfile,
  uploadDirToS3,
  prepareTemplateWithUserInput,
  getStackOutputs,
  getStackParameters,
  createBucketIfNonExisting,
  uploadFileToS3,
  createChangeset,
  describeChangeset,
  executeChangeset,
  stackExists,
} from '../util/aws.js';

export default async function deploy({ config, env, options }) {
  const AWS = getAWSWithProfile(config.profile, config.region);
  const cloudformation = new AWS.CloudFormation();

  const envConfig = getEnvConfig(config, env);
  const stack = stackName(config.name, env);

  const alreadyExists = await stackExists({ stack, cloudformation });

  // Step 1: Run the build command on the static site (if configured)
  // ----------------------------------------------------------------
  if (config.shouldRunBuildCommand && config.buildCommand) {
    await withSpinner('Running build command', async ({ succeed }) => {
      await execa(config.buildCommand, {
        stdtout: 'inherit',
        shell: true,
      });
      succeed();
    });
  }

  // Step 2: Build and upload functions (if any)
  // ----------------------------------------------------------------
  let preparedFunctions = [];
  const lambdaFunctions = await findLambdaFunctions(config.functionsDir);

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
  let compiledTemplate;

  await withSpinner('Building CloudFormation template', async ({ succeed }) => {
    const currentStackParameters = await getStackParameters({
      stack,
      cloudformation,
    });

    const userTemplate = await maybeImportUserTemplate(getUserTemplatePath());

    compiledTemplate = createCloudFormationTemplate({
      config,
      env,
      functions: preparedFunctions,
      currentStackParameters: currentStackParameters.map((p) => p.ParameterKey),
      includeOptionalPrompts: options['update-parameters'],
      userTemplate,
    });

    succeed();
  });

  const template = await prepareTemplateWithUserInput(compiledTemplate);
  let changeset;

  await withSpinner(
    'Checking for needed changes',
    async ({ succeed, update }) => {
      changeset = await createChangeset({
        stack,
        template,
        cloudformation,
        existingStack: alreadyExists,
      });

      if (changeset.shouldExecute) {
        const changes = await describeChangeset({
          stack,
          changeset: changeset.name,
          cloudformation,
        });

        succeed();

        console.log('');
        console.log('This will perform these changes:');
        logChanges(changes.Changes);

        await confirmOrExit('Do you wish to continue?');
      } else {
        update('No changes to stack needed. Now deploying...');
        succeed();
      }
    },
  );

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

          try {
            await uploadFileToS3({
              bucketName: operationsBucket,
              localFile: func.zipFile.zip,
              remoteFile: func.s3Key,
              AWS,
            });
          } catch (e) {
            panic(formatAWSError(e), { label: 'AWS Error' });
          }
        }

        succeed();
      },
    );
  }

  // Step 4: Create or update the CloudFormation stack
  // ----------------------------------------------------------------
  if (changeset.shouldExecute) {
    await withSpinner('Running CloudFormation', async ({ succeed, fail }) => {
      try {
        await executeChangeset({
          cloudformation,
          stack,
          changeset: changeset.name,
          existingStack: alreadyExists,
        });

        succeed();
      } catch (error) {
        fail();
        throw new Error(formatAWSError(error), { label: 'AWS Error' });
      }
    });
  }

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
      panic(formatAWSError(error), { label: 'AWS Error' });
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
      panic(formatAWSError(error), { label: 'AWS Error' });
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

    logOutputs(output);
  });
}
