import { z } from 'zod';
import { awsRegions } from '../util/aws.js';

const isValidAwsRegion = (region) => Object.keys(awsRegions).includes(region);

export const DEFAULT_BUILD_DIR = 'dist';
export const DEFAULT_FUNCTIONS_DIR = 'functions';
export const DEFAULT_BUILD_COMMAND = 'npm run build';

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
  auth: z.boolean().default(false),

  useCustomDomain: z.boolean().default(false),
  customDomain: z.string().optional(),

  parameters: z.record(z.string()).default({}),
});

export const configSchema = z.object({
  // Name of the AWS profile in the AWS credentials file
  profile: z.string().min(1),

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
  name: z.string().min(1),

  // Directory that has the static output to be deployed to S3
  buildDir: z.string().min(1).default(DEFAULT_BUILD_DIR),

  // Directory that has the function code to be deployed to AWS Lambda
  functionsDir: z.string().min(1).default(DEFAULT_FUNCTIONS_DIR),

  // Configuration for functions
  functionsConfig: z
    .object({
      runtime: z.string().min(1).default('nodejs16.x'),
      timeout: z.number().default(10),
      memorySize: z.number().default(128),
      externalModules: z.array(z.string()).default([]),
      envVariables: z.array(z.string()).default([]),
    })
    .default({
      runtime: 'nodejs16.x',
      timeout: 10,
      memorySize: 128,
      externalModules: [],
      envVariables: [],
    }),

  // The command to run to build the project
  buildCommand: z.string().min(1).default(DEFAULT_BUILD_COMMAND),

  // Should the build command be run on deploy?
  shouldRunBuildCommand: z.boolean().default(true),

  // Environment specific configuration
  environments: z.lazy(() => z.record(envConfigSchema)).default({}),
});
