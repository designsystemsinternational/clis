const utils = require("@designsystemsinternational/cli-utils");
const ora = require("ora");
const inquirer = require("inquirer");
const { NO_DYNAMIC_CONFIG } = require("../../src/utils");
const { mockAWS, mockOra } = require("../mock");
const deploy = require("../../src/commands/deploy");

jest.mock("inquirer");
jest.mock("ora", () => {
  const start = jest
    .fn()
    .mockReturnValue({ start: jest.fn(), succeed: jest.fn() });
  return jest.fn(() => ({ start }));
});
jest.mock("@designsystemsinternational/cli-utils", () => ({
  ...jest.requireActual("@designsystemsinternational/cli-utils"),
  loadConfig: jest.fn(),
  saveConfig: jest.fn()
}));

describe("deploy", () => {
  let aws;
  beforeEach(() => {
    aws = mockAWS();
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
      inquirer.prompt.mockResolvedValueOnce({ confirm: true });
      // Test that inquirer receives default stack name
      inquirer.prompt.mockResolvedValueOnce({ stackName: "stack-test" });
      // test that the files are created
      // test that cloudfront happens

      await deploy();
      expect(true).toBe(true);
    });
  });

  describe("update stack", () => {});
});
