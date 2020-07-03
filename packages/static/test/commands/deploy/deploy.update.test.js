const utils = require("@designsystemsinternational/cli-utils");
const inquirer = require("inquirer");
const { mockOra, mockUtils, mockInquirer, mockExeca } = require("../../mock");

describe("update", () => {
  let conf;
  beforeEach(() => {
    const mockAws = mockUtils(utils);
    mockOra();
    mockInquirer(inquirer);
    mockExeca();
    conf = {
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
  });

  it("uploads files if environment is in config", async () => {
    utils.loadConfig.mockReturnValue({
      conf,
      packageJson: {
        name: "fake-package",
        static: conf
      }
    });
    const execa = require("execa");
    const deploy = require("../../../src/commands/deploy");
    await deploy();
    const { calls } = execa.mock;
    expect(calls.length).toBe(2);
    const hasProfile = calls.every(call =>
      call[1].some(input => input === "--profile")
    );
    expect(hasProfile).toBe(true);
  });

  it("excludes profile if not set", async () => {
    delete conf.profile;
    utils.loadConfig.mockReturnValue({
      conf,
      packageJson: {
        name: "fake-package",
        static: conf
      }
    });
    const execa = require("execa");
    const deploy = require("../../../src/commands/deploy");
    await deploy();
    const { calls } = execa.mock;
    expect(calls.length).toBe(2);
    const hasProfile = calls.some(call =>
      call[1].some(input => input === "--profile")
    );
    expect(hasProfile).toBe(false);
  });
});
