/**
 * CloudFormation template to create an S3 bucket to publicly host static files.
 */
const config = {
  AWSTemplateFormatVersion: '2010-09-09',

  Description: 'AWS CloudFormation template to set up a static site on S3',

  Parameters: {
    S3BucketName: {
      Description: 'Name of the S3 bucket.',
      Type: 'String',
    },
    IndexPage: {
      Description: 'Name of the index page.',
      Type: 'String',
      Default: 'index.html',
    },
    ErrorPage: {
      Description: 'Name of the error page.',
      Type: 'String',
      Default: 'index.html',
    },
  },

  Resources: {
    S3Bucket: {
      Type: 'AWS::S3::Bucket',
      Properties: {
        AccessControl: 'PublicRead',
        BucketName: { Ref: 'S3BucketName' },
        MetricsConfigurations: [
          {
            Id: 'EntireBucket',
          },
        ],
        WebsiteConfiguration: {
          IndexDocument: { Ref: 'IndexPage' },
          ErrorDocument: { Ref: 'ErrorPage' },
        },
        CorsConfiguration: {
          CorsRules: [
            {
              AllowedHeaders: ['Authorization'],
              AllowedMethods: ['GET'],
              AllowedOrigins: ['*'],
            },
          ],
        },
      },
    },
  },

  Outputs: {
    S3URL: {
      Description: 'The URL of the S3 website. Use this to bypass caching.',
      Value: { 'Fn::GetAtt': ['S3Bucket', 'WebsiteURL'] },
    },
  },
};

export default config;
