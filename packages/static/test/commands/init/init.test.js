const { existsSync } = require("fs");
const { join } = require("path");
const ora = require("ora");
const inquirer = require("inquirer");
const utils = require("@designsystemsinternational/cli-utils");
const {
  INIT_WITH_CONFIG
} = require("@designsystemsinternational/cli-utils/src/constants");
const {
  mockOra,
  mockUtils,
  mockInquirer
} = require("@designsystemsinternational/cli-utils/test/mock");
const {
  expectSaveConfig
} = require("@designsystemsinternational/cli-utils/test/expectations");

describe("init", () => {
  beforeEach(() => {
    mockUtils(utils);
    mockOra(ora);
    mockInquirer(inquirer);
  });

  it("saves config", async () => {
    utils.loadConfig.mockReturnValue({
      conf: null,
      packageJson: {
        name: "fake-package",
        dynamic: null
      }
    });
    inquirer.prompt.mockResolvedValueOnce({
      profile: "awstest",
      region: "us-east-1",
      buildDir: "build",
      shouldRunBuildCommand: true,
      buildCommand: "npm run build",
      bucket: "test-operations"
    });
    const init = require("../../../src/commands/init");
    await init();
    expectSaveConfig(utils, "static", {
      profile: "awstest",
      region: "us-east-1",
      buildDir: "build",
      shouldRunBuildCommand: true,
      buildCommand: "npm run build",
      bucket: "test-operations"
    });
  });

  it("fails if repo already has static config", async () => {
    utils.loadConfig.mockReturnValue({
      conf: {},
      packageJson: {
        name: "fake-package",
        static: {}
      }
    });
    const init = require("../../../src/commands/init");
    await expect(init()).rejects.toEqual(INIT_WITH_CONFIG);
  });
});
