const { existsSync } = require("fs");
const { join } = require("path");
const utils = require("@designsystemsinternational/cli-utils");
const ora = require("ora");
const inquirer = require("inquirer");
const { NO_DYNAMIC_CONFIG } = require("../../src/utils");
const deploy = require("../../src/commands/deploy");

// Mocks
// ---------------------------------------------------------------

jest.mock("inquirer");
jest.mock("ora", () => {
  const start = jest
    .fn()
    .mockReturnValue({ start: jest.fn(), succeed: jest.fn() });
  return jest.fn(() => ({ start }));
});

const mockCreateStack = jest.fn();
const mockWaitFor = jest.fn();
jest.mock("@designsystemsinternational/cli-utils", () => ({
  ...jest.requireActual("@designsystemsinternational/cli-utils"),
  loadConfig: jest.fn(),
  saveConfig: jest.fn(),
  uploadFilesToS3: jest.fn(),
  getAWSWithProfile: () => ({
    CloudFormation: jest.fn(() => ({
      createStack: mockCreateStack,
      waitFor: mockWaitFor
    }))
  })
}));

const resetMock = func => {
  func.mockReset().mockReturnValue({
    promise: jest.fn().mockResolvedValue({})
  });
};

// Tests
// ---------------------------------------------------------------

describe("deploy", () => {
  beforeEach(() => {
    resetMock(mockCreateStack);
    resetMock(mockWaitFor);
  });

  describe("create stack", () => {
    it("should raise error if no dynamic config", async () => {
      utils.loadConfig.mockReturnValue({ name: "fake-package" });
      await expect(deploy()).rejects.toEqual(NO_DYNAMIC_CONFIG);
    });

    it.only("should create stack if environment is not in config", async () => {
      const conf = {
        buildDir: "test/build",
        cloudformationMatch: ["test/fake-package/cf.js"],
        lambdaMatch: ["test/fake-package/lambda.js"],
        profile: "fake-profile",
        region: "fake-region",
        bucket: "fake-bucket"
      };
      utils.loadConfig.mockReturnValue({
        conf,
        packageJson: {
          name: "fake-package",
          dynamic: conf
        }
      });
      inquirer.prompt
        .mockResolvedValueOnce({ confirm: true })
        .mockResolvedValueOnce({ stackName: "stack-test" })
        .mockResolvedValueOnce({ testParam: "test-value" });

      await deploy();

      // Test that inquirer got the questions from parameters
      const inquirerCalls = inquirer.prompt.mock.calls;
      expect(inquirerCalls.length).toBe(3);
      expect(inquirerCalls[0][0][0].name).toEqual("confirm");
      expect(inquirerCalls[1][0][0].name).toEqual("stackName");
      expect(inquirerCalls[2][0][0].name).toEqual("testParam");

      // file creation
      expect(
        existsSync(join(__dirname, "..", "build", "lambda", "index.js"))
      ).toBe(true);
      expect(existsSync(join(__dirname, "..", "build", "lambda.zip"))).toBe(
        true
      );

      // S3 upload
      const uploadCalls = utils.uploadFilesToS3.mock.calls;
      expect(uploadCalls.length).toBe(1);
      expect(uploadCalls[0][1]).toEqual("fake-bucket");
      const uploadFiles = uploadCalls[0][2];
      const uploadFilesKeys = Object.keys(uploadFiles);
      expect(uploadFilesKeys[0]).toMatch(
        "@designsystemsinternational/dynamic/test/build/lambda.zip"
      );
      expect(uploadFiles[uploadFilesKeys[0]]).toEqual(
        "functions/tests/lambda-5cdadd95e5d195a9956a5c7fc92f9135.zip"
      );

      // createStack
      const { calls } = mockCreateStack.mock;
      expect(calls.length).toBe(1);
      expect(calls[0][0].StackName).toEqual("stack-test");
      expect(calls[0][0].TemplateBody).toBeDefined();
      expect(calls[0][0].Parameters).toBeDefined();

      const tmpl = JSON.parse(calls[0][0].TemplateBody);
      expect(Object.keys(tmpl.Parameters)).toEqual([
        "testParam",
        "operationsS3Bucket",
        "environment",
        "lambdaS3Key"
      ]);
      expect(Object.keys(tmpl.Resources)).toEqual(["testLogGroup"]);
      expect(Object.keys(tmpl.Outputs)).toEqual(["testOutput"]);
      expect(calls[0][0].Parameters[0]).toEqual({
        ParameterKey: "testParam",
        ParameterValue: "test-value"
      });
      expect(calls[0][0].Parameters[1]).toEqual({
        ParameterKey: "operationsS3Bucket",
        ParameterValue: "fake-bucket"
      });
      expect(calls[0][0].Parameters[2]).toEqual({
        ParameterKey: "environment",
        ParameterValue: "tests"
      });
      expect(calls[0][0].Parameters[3]).toEqual({
        ParameterKey: "lambdaS3Key",
        ParameterValue:
          "functions/tests/lambda-5cdadd95e5d195a9956a5c7fc92f9135.zip"
      });
    });
  });

  describe("update stack", () => {});
});
