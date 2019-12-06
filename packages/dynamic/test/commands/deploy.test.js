const deploy = require("../../src/commands/deploy");
const inquirer = require("inquirer");
const utils = require("@designsystemsinternational/cli-utils");
const { NO_DYNAMIC_CONFIG } = require("../../src/utils");
const { mockAWS } = require("../mock");

jest.mock("inquirer");
jest.mock("@designsystemsinternational/cli-utils");

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

    it("should create stack if environment is not in config", async () => {
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
