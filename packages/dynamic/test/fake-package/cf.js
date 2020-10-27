module.exports = {
  Parameters: {
    testParam: {
      Description: "A test param",
      Type: "String"
    }
  },
  Conditions: {
    HasParam: { "Fn::Not": [{ "Fn::Equals": [{ Ref: "testParam" }, ""] }] }
  },
  Resources: {
    testLogGroup: {
      Type: "AWS::Logs::LogGroup",
      Properties: {
        LogGroupName: "aws/does/not/matter"
      }
    }
  },
  Outputs: {
    testOutput: {
      Description: "A test output",
      Value: "Hello"
    }
  }
};
