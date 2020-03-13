const mockOra = mod => {
  const start = jest
    .fn()
    .mockReturnValue({ start: jest.fn(), succeed: jest.fn() });
  jest.doMock("ora", () => jest.fn().mockReturnValue({ start }));
};

const mockUtils = mod => {
  jest.spyOn(mod, "loadConfig");
  jest.spyOn(mod, "saveConfig").mockReturnValue(true);
  jest.spyOn(mod, "getEnvironment").mockReturnValue("test");
  jest.spyOn(mod, "uploadFilesToS3").mockReturnValue(true);
  jest.spyOn(mod, "monitorStack").mockReturnValue(true);
  jest.spyOn(mod, "waitForChangeset").mockReturnValue(true);

  const mockCloudformation = {
    createStack: jest.fn().mockReturnValue({ promise: jest.fn() }),
    createChangeSet: jest.fn().mockReturnValue({ promise: jest.fn() }),
    executeChangeSet: jest.fn().mockReturnValue({ promise: jest.fn() }),
    describeStacks: jest.fn().mockReturnValue({
      promise: jest.fn(() => {
        return {
          Stacks: [
            {
              Parameters: [
                { ParameterKey: "testParam" },
                { ParameterKey: "operationsS3Bucket" },
                { ParameterKey: "environment" },
                { ParameterKey: "lambdaS3Key" }
              ]
            }
          ]
        };
      })
    }),
    waitFor: jest.fn().mockReturnValue({ promise: jest.fn() })
  };

  jest.spyOn(mod, "getAWSWithProfile").mockReturnValue({
    CloudFormation: jest.fn(() => mockCloudformation)
  });

  return { mockCloudformation };
};

const mockInquirer = mod => {
  jest.spyOn(mod, "prompt");
};

module.exports = {
  mockOra,
  mockUtils,
  mockInquirer
};
