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

// Tests
// ---------------------------------------------------------------

const resetMock = func => {
  func.mockReset().mockReturnValue({
    promise: jest.fn().mockResolvedValue({})
  });
};

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
        .mockResolvedValueOnce({ stackName: "stack-test" });

      await deploy();
      // test that the files are created
      // normal
      // zip
      // check files were uploaded to S3
      // test that createStack happens
      expect(mockCreateStack.mock.calls.length).toEqual(1);
      // test that waitFor happens
    });
  });

  describe("update stack", () => {});
});
