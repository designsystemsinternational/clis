module.exports = {
  Parameters: {
    testParam: {
      Description: "A test param",
      Type: "String"
    }
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
