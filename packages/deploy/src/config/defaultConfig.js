/**
 * The default configuration. The user's config gets merged with this, while
 * values in the user's config take precedence.
 */
export const defaultConfig = {
  // Name of the AWS profile in the AWS credentials file
  profile: null,

  // AWS Region to deploy to
  region: 'us-east-1',

  // Name of the S3 bucket to deploy to
  bucket: 'my-bucket',

  // Directory that has the static output to be deployed to S3
  buildDir: 'dist',

  // Directory that has the function code to be deployed to AWS Lambda
  functionsDir: 'functions',

  // The command to run to build the project
  buildCommand: 'npm run build',

  // Should the build command be run on deploy?
  shouldRunBuildCommand: true,
};

/**
 * Default file configuration to be used to configure the delivery of the static
 * S3 files through CloudFront.
 */
export const defaultFileParams = [
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
];
