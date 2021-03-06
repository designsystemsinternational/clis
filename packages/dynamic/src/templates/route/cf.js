module.exports = {
  Resources: {
    api: {
      Type: "AWS::ApiGatewayV2::Api",
      Properties: {
        Name: { Ref: "AWS::StackName" },
        ProtocolType: "HTTP",
        CorsConfiguration: {
          AllowMethods: ["*"],
          AllowOrigins: ["*"],
          AllowHeaders: ["*"]
        }
      }
    },

    stage: {
      Type: "AWS::ApiGatewayV2::Stage",
      Properties: {
        Description: { Ref: "AWS::StackName" },
        StageName: { Ref: "environment" },
        AutoDeploy: true,
        ApiId: { Ref: "api" },
        AccessLogSettings: {
          DestinationArn: {
            "Fn::GetAtt": ["stageLogGroup", "Arn"]
          },
          Format:
            '$context.identity.sourceIp - - [$context.requestTime] "$context.httpMethod $context.path $context.protocol" $context.status $context.responseLength - "$context.identity.userAgent" $context.requestId'
        }
      }
    },

    stageLogGroup: {
      Type: "AWS::Logs::LogGroup",
      Properties: {
        LogGroupName: { "Fn::Sub": "${AWS::StackName}-gateway" },
        RetentionInDays: 30
      }
    }
  },
  Outputs: {
    apiUrl: {
      Description: "The URL of the API",
      Value: {
        "Fn::Sub":
          "https://${api}.execute-api.${AWS::Region}.amazonaws.com/${environment}"
      }
    }
  }
};
