const { existsSync } = require("fs");
const { join } = require("path");
const utils = require("@designsystemsinternational/cli-utils");
const ora = require("ora");
const inquirer = require("inquirer");
const { NO_PACKAGE_NAME } = require("../../src/utils");
const { mockOra, mockUtils, mockInquirer } = require("../mock");

describe("init", () => {
  let cloudformation, s3;
  beforeEach(() => {
    const mockAws = mockUtils(utils);
    cloudformation = mockAws.mockCloudformation;
    s3 = mockAws.mockS3;
    mockOra(ora);
    mockInquirer(inquirer);
  });

  it.only("should set up config and create S3 bucket", async () => {
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
    const init = require("../../src/commands/init");
    await init();

    expect(s3.createBucket.mock.calls.length).toBe(1);
    expect(s3.createBucket.mock.calls[0][0]).toEqual({
      Bucket: "test-operations"
    });

    const saveCalls = utils.saveConfig.mock.calls;
    expect(saveCalls.length).toBe(1);
    expect(saveCalls[0][0]).toEqual("dynamic");
    expect(saveCalls[0][1]).toEqual({
      profile: "awstest",
      region: "us-east-1",
      bucket: "test-operations"
    });
  });
});
