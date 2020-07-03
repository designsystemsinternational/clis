// Function that returns a function that returns a .promise that returns the value
const func = ret => {
  return jest.fn().mockReturnValue({ promise: jest.fn().mockReturnValue(ret) });
};

// Function that returns the value of an object if it exists, or defaultValue
const val = (obj, key, defaultValue) =>
  obj.hasOwnProperty(key) ? obj[key] : defaultValue;

const mockOra = mod => {
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

const mockUtils = (mod, ret = {}) => {
  jest.spyOn(mod, "loadConfig").mockReturnValue(val(ret, "loadConfig", true));
  jest.spyOn(mod, "saveConfig").mockReturnValue(val(ret, "saveConfig", true));
  jest
    .spyOn(mod, "saveEnvironmentConfig")
    .mockReturnValue(val(ret, "saveEnvironmentConfig", true));
  jest
    .spyOn(mod, "deleteEnvironmentConfig")
    .mockReturnValue(val(ret, "deleteEnvironmentConfig", true));
  jest
    .spyOn(mod, "getEnvironment")
    .mockReturnValue(val(ret, "getEnvironment", "test"));
  jest
    .spyOn(mod, "uploadFilesToS3")
    .mockReturnValue(val(ret, "uploadFilesToS3", true));
  jest
    .spyOn(mod, "monitorStack")
    .mockReturnValue(val(ret, "monitorStack", true));
  jest
    .spyOn(mod, "waitForChangeset")
    .mockReturnValue(val(ret, "waitForChangeset", true));
  jest.spyOn(mod, "checkS3BucketExists");

  const mockS3 = {
    createBucket: func(ret.createBucket)
  };

  const mockCloudformation = {
    createStack: func(val(ret, "createStack", { StackId: 1 })),
    deleteStack: func(val(ret, "deleteStack")),
    createChangeSet: func(val(ret, "createChangeSet")),
    executeChangeSet: func(val(ret, "executeChangeSet")),
    describeStacks: func(val(ret, "describeStacks")),
    waitFor: func(val(ret, "waitFor"))
  };

  jest.spyOn(mod, "getAWSWithProfile").mockReturnValue({
    CloudFormation: jest.fn(() => mockCloudformation),
    S3: jest.fn(() => mockS3)
  });

  return { mockCloudformation, mockS3 };
};

module.exports = {
  mockOra,
  mockInquirer,
  mockExeca,
  mockUtils
};
