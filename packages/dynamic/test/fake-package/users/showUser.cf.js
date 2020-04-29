module.exports = {
  Parameters: {
    anotherParam: {
      Description: "Another param",
      Type: "String"
    }
  },
  Resources: {
    anotherLogGroup: {
      Type: "AWS::Logs::LogGroup",
      Properties: {
        LogGroupName: "aws/another"
      }
    }
  },
  Outputs: {
    anotherOutput: {
      Description: "Another output",
      Value: "Hello"
    }
  }
};
