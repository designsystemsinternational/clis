import { z } from 'zod';
import { awsRegions } from '@designsystemsinternational/cli-utils';

const isValidAwsRegion = (region) => Object.keys(awsRegions).includes(region);

/**
 * Default file configuration to be used to configure the delivery of the static
 * S3 files through CloudFront.
 */
export const fileParamsSchema = z
  .array(
    z.object({
      match: z.array(z.string()),
      params: z.object({
        CacheControl: z.string(),
      }),
    }),
  )
  .default([
    {
      match: ['!**/*.(html|json)'],
      params: {
        CacheControl: 'public, max-age=31536000, immutable',
      },
    },
    {
      match: ['**/*.(html|json)'],
      params: {
        CacheControl: 'public, max-age=300',
      },
    },
  ]);

/**
 * Default configuration for a deployment environment.
 */
export const envConfigSchema = z.object({
  // File parameters (can be null)
  fileParameters: fileParamsSchema,

  // Optional parameters to setup authentication
  auth: z
    .object({
      username: z.string(),
      password: z.string(),
    })
    .optional(),
});

export const configSchema = z.object({
  // Name of the AWS profile in the AWS credentials file
  profile: z.string(),

  // AWS Region to deploy to
  region: z
    .string()
    .refine(isValidAwsRegion, {
      message: `Invalid AWS region. Valid regions are: ${Object.keys(
        awsRegions,
      ).join(', ')}`,
    })
    .default('us-east-1'),

  // Name of the project
  name: z.string(),

  // Directory that has the static output to be deployed to S3
  buildDir: z.string().default('dist'),

  // Directory that has the function code to be deployed to AWS Lambda
  functionsDir: z.string().default('functions'),

  // Configuration for functions
  functionsConfig: z
    .object({
      runtime: z.string().default('nodejs16.x'),
      timeout: z.number().default(10),
      memorySize: z.number().default(128),
      externalModules: z.array(z.string()).default([]),
    })
    .default({
      runtime: 'nodejs16.x',
      timeout: 10,
      memorySize: 128,
      externalModules: [],
    }),

  // The command to run to build the project
  buildCommand: z.string().default('npm run build'),

  // Should the build command be run on deploy?
  shouldRunBuildCommand: z.boolean().default(true),

  // Environment specific configuration
  environments: z.lazy(() => z.record(envConfigSchema)).default({}),
});
