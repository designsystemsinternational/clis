const { existsSync } = require("fs");
const { join } = require("path");
const utils = require("@designsystemsinternational/cli-utils");
const ora = require("ora");
const inquirer = require("inquirer");
const { mockOra, mockUtils, mockInquirer, mockExeca } = require("../mock");

describe("destroy", () => {
  let cloudformation;
  beforeEach(() => {
    const mockAws = mockUtils(utils);
    cloudformation = mockAws.mockCloudformation;
    mockOra();
    mockInquirer(inquirer);
    mockExeca();
  });

  it("should create stack if environment is not in config", async () => {
    const conf = {
      profile: "fake-profile",
      region: "fake-region",
      buildDir: "test/build",
      environments: {
        test: {
          stack: "stack-test",
          bucket: "bucket-test",
          htmlCache: "300",
          assetsCache: "31536000"
        }
      }
    };
    utils.loadConfig.mockReturnValue({
      conf,
      packageJson: {
        name: "fake-package",
        static: conf
      }
    });
    inquirer.prompt.mockResolvedValueOnce({ confirm: true });

    const execa = require("execa");
    const destroy = require("../../src/commands/destroy");
    await destroy();

    const execaCalls = execa.mock.calls;
    expect(execaCalls.length).toBe(1);

    const { calls } = cloudformation.deleteStack.mock;
    expect(calls.length).toBe(1);
    expect(calls[0][0].StackName).toEqual("stack-test");

    const saveCalls = utils.deleteEnvironmentConfig.mock.calls;
    expect(saveCalls.length).toBe(1);
    expect(saveCalls[0][0]).toEqual("static");
    expect(saveCalls[0][1]).toEqual("test");
  });
});
