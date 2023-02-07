/**
 * Template setting up a lambda function.
 * This will be created and applied for every function.
 */
export default function ({ config, functionDefinition }) {
  const { name, route } = functionDefinition;

  return {
    Resources: {
      [`${name}LambdaRole`]: {
        Type: 'AWS::IAM::Role',
        Properties: {
          RoleName: {
            'Fn::Sub': `\${AWS::StackName}-${name}`,
          },
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: {
                  Service: ['lambda.amazonaws.com'],
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

      [`${name}Lambda`]: {
        Type: 'AWS::Lambda::Function',
        DependsOn: [`${name}LambdaRole`],
        Properties: {
          FunctionName: {
            'Fn::Sub': `\${AWS::StackName}-${name}`,
          },
          Code: {
            S3Bucket: { Ref: 'operationsS3Bucket' },
            S3Key: { Ref: `${name}S3Key` },
          },
          Runtime: config.functionsConfig.runtime,
          Timeout: config.functionsConfig.timeout,
          Handler: 'index.handler',
          Role: { 'Fn::GetAtt': [`${name}LambdaRole`, 'Arn'] },
          Environment: {
            Variables: {
              ...config.functionsConfig.envVariables.reduce(
                (acc, envVariable) => {
                  const key = envVariable.toUpperCase();
                  acc[key] = { Ref: envVariable };
                  return acc;
                },
                {},
              ),
            },
          },
        },
      },

      [`${name}Permission`]: {
        Type: 'AWS::Lambda::Permission',
        DependsOn: [`${name}Lambda`],
        Properties: {
          Action: 'lambda:InvokeFunction',
          FunctionName: { Ref: `${name}Lambda` },
          Principal: 'apigateway.amazonaws.com',
          SourceArn: {
            'Fn::Sub':
              'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${api}/*/*/{{route}}',
          },
        },
      },

      [`${name}Integration`]: {
        Type: 'AWS::ApiGatewayV2::Integration',
        DependsOn: [`${name}Permission`],
        Properties: {
          ApiId: { Ref: 'api' },
          IntegrationType: 'AWS_PROXY',
          IntegrationUri: {
            'Fn::Sub': `arn:aws:apigateway:\${AWS::Region}:lambda:path/2015-03-31/functions/\${${name}Lambda.Arn}/invocations`,
          },
          PayloadFormatVersion: '2.0',
        },
      },

      ...['Get', 'Post', 'Put', 'Delete'].reduce((acc, httpVerb) => {
        const httpVerbUpper = httpVerb.toUpperCase();

        acc[`${name}${httpVerb}Route`] = {
          Type: 'AWS::ApiGatewayV2::Route',
          DependsOn: [`${name}Integration`],
          Properties: {
            ApiId: { Ref: 'api' },
            RouteKey: `${httpVerbUpper} /${route}`,
            AuthorizationType: 'NONE',
            Target: { 'Fn::Sub': `integrations/\${${name}Integration}` },
          },
        };

        return acc;
      }, {}),
    },
    Outputs: {
      [`${name}Endpoint`]: {
        Description: `Endpoint for ${name} function`,
        Value: {
          'Fn::Sub': `https://\${api}.execute-api.\${AWS::Region}.amazonaws.com/\${stage}/${route}`,
        },
      },
    },
  };
}
