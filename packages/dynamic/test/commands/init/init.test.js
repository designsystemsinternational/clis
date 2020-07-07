const { existsSync } = require("fs");
const { join } = require("path");
const utils = require("@designsystemsinternational/cli-utils");
const ora = require("ora");
const inquirer = require("inquirer");
const {
  mockOra,
  mockUtils,
  mockInquirer
} = require("@designsystemsinternational/cli-utils/test/mock");
const {
  expectSaveConfig
} = require("@designsystemsinternational/cli-utils/test/expectations");
const {
  INIT_WITH_CONFIG
} = require("@designsystemsinternational/cli-utils/src/constants");

describe("init", () => {
  let cloudformation, s3;
  beforeEach(() => {
    const mockAws = mockUtils(utils);
    cloudformation = mockAws.mockCloudformation;
    s3 = mockAws.mockS3;
    mockOra(ora);
    mockInquirer(inquirer);
  });

  it("saves config and creates S3 bucket", async () => {
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
      bucket: "test-operations"
    });
    utils.checkS3BucketExists.mockReturnValue(false);
    const init = require("../../../src/commands/init");
    await init();

    expect(s3.createBucket.mock.calls.length).toBe(1);
    expect(s3.createBucket.mock.calls[0][0]).toEqual({
      Bucket: "test-operations"
    });

    expectSaveConfig(utils, "dynamic", {
      profile: "awstest",
      region: "us-east-1",
      bucket: "test-operations"
    });
  });

  it("fails if repo already has dynamic config", async () => {
    utils.loadConfig.mockReturnValue({
      conf: {},
      packageJson: {
        name: "fake-package",
        dynamic: {}
      }
    });
    const init = require("../../../src/commands/init");
    await expect(init()).rejects.toEqual(INIT_WITH_CONFIG);
  });
});
