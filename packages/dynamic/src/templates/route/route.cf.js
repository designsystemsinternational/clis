module.exports = {
  Resources: {
    <%= name %>Integration: {
      Type: "AWS::ApiGatewayV2::Integration",
      Properties: {
        ApiId: { Ref: "api" },
        IntegrationType: "AWS_PROXY",
        IntegrationUri: {
          "Fn::Sub":
            "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${<%= name %>Lambda.Arn}/invocations"
        },
        PayloadFormatVersion: "2.0"
      }
    },

    <%= name %>Route: {
      Type: "AWS::ApiGatewayV2::Route",
      DependsOn: ["<%= name %>Integration"],
      Properties: {
        ApiId: { Ref: "api" },
        RouteKey: "<%= route %>",
        AuthorizationType: "NONE",
        Target: { "Fn::Sub": "integrations/${<%= name %>Integration}" }
      }
    },

    <%= name %>LambdaRole: {
      Type: "AWS::IAM::Role",
      Properties: {
        RoleName: {
          "Fn::Sub": "${AWS::StackName}-<%= name %>"
        },
        AssumeRolePolicyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                Service: ["lambda.amazonaws.com"]
              },
              Action: ["sts:AssumeRole"]
            }
          ]
        },
        Policies: [
          {
            PolicyName: "root",
            PolicyDocument: {
              Version: "2012-10-17",
              Statement: [
                {
                  Effect: "Allow",
                  Resource: "arn:aws:logs:*:*:*",
                  Action: "logs:*"
                }
              ]
            }
          }
        ]
      }
    },

    <%= name %>Lambda: {
      Type: "AWS::Lambda::Function",
      Properties: {
        FunctionName: {
          "Fn::Sub": "${AWS::StackName}-<%= name %>"
        },
        Code: {
          S3Bucket: { Ref: "operationsS3Bucket" },
          S3Key: { Ref: "<%= name %>S3Key" }
        },
        Runtime: "nodejs10.x",
        Handler: "index.handler",
        Role: { "Fn::GetAtt": ["<%= name %>LambdaRole", "Arn"] }
      }
    },

    <%= name %>Permission: {
      Type: "AWS::Lambda::Permission",
      Properties: {
        Action: "lambda:InvokeFunction",
        FunctionName: { Ref: "<%= name %>Lambda" },
        Principal: "apigateway.amazonaws.com",
        SourceArn: {
          "Fn::Sub":
            "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${api}/*/*"
        }
      }
    }
  }
};
