const mockOra = () => {
  const start = jest
    .fn()
    .mockReturnValue({ start: jest.fn(), succeed: jest.fn(), fail: jest.fn() });
  jest.doMock("ora", () => jest.fn().mockReturnValue({ start }));
};

const mockInquirer = mod => {
  jest.spyOn(mod, "prompt");
};

const mockExeca = () => {
  jest.doMock("execa", () => jest.fn().mockReturnValue(() => {}));
};

const mockUtils = mod => {
  jest.spyOn(mod, "loadConfig");
  jest.spyOn(mod, "saveConfig").mockReturnValue(true);
  jest.spyOn(mod, "saveEnvironmentConfig").mockReturnValue(true);
  jest.spyOn(mod, "deleteEnvironmentConfig").mockReturnValue(true);
  jest.spyOn(mod, "getEnvironment").mockReturnValue("test");
  jest.spyOn(mod, "uploadFilesToS3").mockReturnValue(true);
  jest.spyOn(mod, "monitorStack").mockReturnValue(true);
  jest.spyOn(mod, "waitForChangeset").mockReturnValue(true);
  jest.spyOn(mod, "checkS3BucketExists");

  const mockS3 = {
    createBucket: jest.fn().mockReturnValue({ promise: jest.fn() })
  };

  const mockCloudformation = {
    createStack: jest.fn().mockReturnValue({
      promise: jest.fn().mockReturnValue({ StackId: 1 })
    }),
    deleteStack: jest.fn().mockReturnValue({ promise: jest.fn() }),
    createChangeSet: jest.fn().mockReturnValue({ promise: jest.fn() }),
    executeChangeSet: jest.fn().mockReturnValue({ promise: jest.fn() }),
    describeStacks: jest.fn().mockReturnValue({
      promise: jest.fn(() => {
        return {
          Stacks: [
            {
              Outputs: [{ OutputKey: "a", OutputValue: "b", Description: "c" }]
            }
          ]
        };
      })
    }),
    waitFor: jest.fn().mockReturnValue({ promise: jest.fn() })
  };

  jest.spyOn(mod, "getAWSWithProfile").mockReturnValue({
    CloudFormation: jest.fn(() => mockCloudformation),
    S3: jest.fn(() => mockS3)
  });

  return { mockCloudformation, mockS3 };
};

module.exports = {
  mockOra,
  mockUtils,
  mockInquirer,
  mockExeca
};