/**
 * Template setting up S3 and CloudFront to host a static website.
 * This is the base config for every stack.
 */
export default function ({
  config,
  environmentConfig,
  environmentName,
  includesLambdaFunctions,
}) {
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: `Static website for ${config.name} (${environmentName})`,
    Parameters: {
      environment: {
        Description: 'The environment to deploy to',
        Type: 'String',
        Default: environmentName,
      },
      IndexPage: {
        Description: 'The index page for the website',
        Type: 'String',
        Default: 'index.html',
      },
      ErrorPage: {
        Description: 'The error page for the website',
        Type: 'String',
        Default: 'index.html',
      },
      S3BucketName: {
        Description: 'The name of the S3 bucket',
        Type: 'String',
      },

      ...(environmentConfig.useCustomDomain && {
        Domain: {
          Description: 'Domain of the website',
          Type: 'String',
        },
        HostedZoneID: {
          Description: 'The ID of your hosted zone in Route 53',
          Type: 'AWS::Route53::HostedZone::Id',
        },
      }),

      ...(environmentConfig.auth && {
        AuthUsername: {
          Description: 'Username to be used for basic authentication',
          Type: 'String',
        },
        AuthPassword: {
          Description: 'Password to be used for basic authentication',
          Type: 'String',
        },
      }),

      // Add any env variables defined in the user config to the parameters
      // but only if we have functions to deploy
      ...config.functionsConfig.envVariables.reduce((acc, envVariable) => {
        acc[envVariable] = {
          Description: `The value for the environment variable ${envVariable}`,
          Type: 'String',
        };
        return acc;
      }, {}),
    },
    Resources: {
      S3Bucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          AccessControl: 'PublicRead',
          BucketName: {
            Ref: 'S3BucketName',
          },
          MetricsConfigurations: [
            {
              Id: 'EntireBucket',
            },
          ],
          WebsiteConfiguration: {
            IndexDocument: {
              Ref: 'IndexPage',
            },
            ErrorDocument: {
              Ref: 'ErrorPage',
            },
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

      // Cloudfront
      ...(!environmentConfig.skipCloudfront && {
        CloudfrontDistribution: {
          Type: 'AWS::CloudFront::Distribution',
          Properties: {
            DistributionConfig: {
              Enabled: true,
              Comment: { 'Fn::Sub': 'S3 bucket ${S3BucketName}' },
              DefaultRootObject: 'index.html',
              HttpVersion: 'http2',
              IPV6Enabled: true,
              Origins: [
                {
                  Id: 's3-website-origin',
                  DomainName: {
                    'Fn::Select': [
                      2,
                      {
                        'Fn::Split': [
                          '/',
                          { 'Fn::GetAtt': ['S3Bucket', 'WebsiteURL'] },
                        ],
                      },
                    ],
                  },

                  CustomOriginConfig: {
                    OriginProtocolPolicy: 'http-only',
                  },
                },
              ],
              DefaultCacheBehavior: {
                TargetOriginId: 's3-website-origin',
                MaxTTL: 31536000,
                MinTTL: 0,
                Compress: true,
                ViewerProtocolPolicy: 'redirect-to-https',
                ForwardedValues: {
                  Cookies: {
                    Forward: 'none',
                  },
                  QueryString: false,
                },

                // If an environment should feature Basic Auth we need to add a lambda function to cloudfront
                ...(environmentConfig.auth && {
                  LambdaFunctionAssociations: [
                    {
                      EventType: 'viewer-request',
                      LambdaFunctionARN: { Ref: 'VersionedAuthLambda' },
                    },
                  ],
                }),
              },
            },
          },
        },
      }),

      // Added resources to enable HTTP Basic Auth
      ...(environmentConfig.auth && {
        AuthLambdaRole: {
          Type: 'AWS::IAM::Role',
          Properties: {
            RoleName: {
              'Fn::Sub': '${AWS::StackName}-auth-lambda',
            },
            AssumeRolePolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: {
                    Service: [
                      'lambda.amazonaws.com',
                      'edgelambda.amazonaws.com',
                    ],
                  },
                  Action: ['sts:AssumeRole'],
                },
              ],
            },
            Policies: [
              {
                PolicyName: 'root',
                PolicyDocument: {
                  Version: '2012-10-17',
                  Statement: [
                    {
                      Effect: 'Allow',
                      Resource: 'arn:aws:logs:*:*:*',
                      Action: 'logs:*',
                    },
                  ],
                },
              },
            ],
          },
        },
        AuthLambda: {
          Type: 'AWS::Lambda::Function',
          Properties: {
            FunctionName: {
              'Fn::Sub': '${AWS::StackName}-auth-lambda',
            },
            Description:
              'Lambda function to provide basic auth for a CloudFront distribution',
            Code: {
              ZipFile: {
                'Fn::Sub':
                  "'use strict'; exports.handler = (event, context, callback) => { const request = event.Records[0].cf.request; const headers = request.headers; const authUser = '${AuthUsername}'; const authPass = '${AuthPassword}'; const authString = 'Basic ' + new Buffer(authUser + ':' + authPass).toString('base64'); if (typeof headers.authorization == 'undefined' || headers.authorization[0].value != authString) { const body = 'Unauthorized'; const response = { status: '401', statusDescription: 'Unauthorized', body: body, headers: { 'www-authenticate': [{key: 'WWW-Authenticate', value:'Basic'}] } }; callback(null, response); } callback(null, request); };",
              },
            },
            MemorySize: 128,
            Timeout: 5,
            Runtime: 'nodejs16.x',
            Handler: 'index.handler',
            Role: {
              'Fn::GetAtt': ['AuthLambdaRole', 'Arn'],
            },
          },
        },
        VersionedAuthLambda: {
          Type: 'AWS::Lambda::Version',
          Properties: {
            FunctionName: {
              Ref: 'AuthLambda',
            },
          },
        },
        AuthLambdaLogGroup: {
          Type: 'AWS::Logs::LogGroup',
          Properties: {
            LogGroupName: {
              'Fn::Join': [
                '/',
                [
                  '/aws/lambda',
                  {
                    Ref: 'AuthLambda',
                  },
                ],
              ],
            },
            RetentionInDays: 30,
          },
        },
      }),

      // If the stack includes Lambda Functions we'll need to set up an API Gateway
      ...(includesLambdaFunctions && {
        api: {
          Type: 'AWS::ApiGatewayV2::Api',
          Properties: {
            Name: {
              Ref: 'AWS::StackName',
            },
            ProtocolType: 'HTTP',
            CorsConfiguration: {
              AllowMethods: ['*'],
              AllowOrigins: ['*'],
              AllowHeaders: ['*'],
            },
          },
        },
        stage: {
          Type: 'AWS::ApiGatewayV2::Stage',
          Properties: {
            Description: {
              Ref: 'AWS::StackName',
            },
            StageName: {
              Ref: 'environment',
            },
            AutoDeploy: true,
            ApiId: {
              Ref: 'api',
            },
            AccessLogSettings: {
              DestinationArn: {
                'Fn::GetAtt': ['stageLogGroup', 'Arn'],
              },
              Format:
                '$context.identity.sourceIp - - [$context.requestTime] "$context.httpMethod $context.path $context.protocol" $context.status $context.responseLength - "$context.identity.userAgent" $context.requestId',
            },
          },
        },
        stageLogGroup: {
          Type: 'AWS::Logs::LogGroup',
          Properties: {
            LogGroupName: {
              'Fn::Sub': '${AWS::StackName}-gateway',
            },
            RetentionInDays: 30,
          },
        },
      }),

      ...(environmentConfig.useCustomDomain && {
        Route53Record: {
          Type: 'AWS::Route53::RecordSet',
          Properties: {
            HostedZoneId: { Ref: 'HostedZoneID' },
            Name: { Ref: 'Domain' },
            Type: 'A',
            AliasTarget: {
              HostedZoneId: 'Z2FDTNDATAQYW2',
              DNSName: {
                'Fn::GetAtt': ['CloudfrontDistribution', 'DomainName'],
              },
            },
          },
        },
        Certificate: {
          Type: 'AWS::CertificateManager::Certificate',
          Properties: {
            DomainName: { Ref: 'Domain' },
            ValidationMethod: 'DNS',
            DomainValidationOptions: [
              {
                DomainName: { Ref: 'Domain' },
                HostedZoneId: { Ref: 'HostedZoneID' },
              },
            ],
          },
        },
      }),
    },
    Outputs: {
      S3Url: {
        Description: 'The URL of the S3 website. Use this to bypass caching.',
        Value: {
          'Fn::GetAtt': ['S3Bucket', 'WebsiteURL'],
        },
      },
      ...(!environmentConfig.skipCloudfront && {
        CloudfrontURL: {
          Description:
            'The URL of the cached Cloudfront website. Use this for production.',
          Value: { 'Fn::GetAtt': ['CloudfrontDistribution', 'DomainName'] },
        },
      }),

      // Add the API Gateway URL to the stack outputs if the stack includes Lambda Functions
      ...(includesLambdaFunctions && {
        apiUrl: {
          Description: 'The URL of the API',
          Value: {
            'Fn::Sub':
              'https://${api}.execute-api.${AWS::Region}.amazonaws.com/${environment}',
          },
        },
      }),

      // Domain
      ...(environmentConfig.useCustomDomain && {
        DomainURL: {
          Description: 'The URL of the custom domain',
          Value: { Ref: 'Domain' },
        },
      }),
    },
  };
}
