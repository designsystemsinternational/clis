const { existsSync } = require("fs");
const { join } = require("path");
const utils = require("@designsystemsinternational/cli-utils");
const ora = require("ora");
const inquirer = require("inquirer");
const { lambdaExists, zipExists } = require("../../utils");
const { mockOra, mockUtils, mockInquirer } = require("../../mock");

describe("updateFunction", () => {
  let cloudformation, conf;
  beforeEach(() => {
    const mockAws = mockUtils(utils);
    cloudformation = mockAws.mockCloudformation;
    mockOra(ora);
    mockInquirer(inquirer);
    conf = {
      buildDir: "test/build",
      cloudformationMatch: ["test/fake-package/**/*cf.js"],
      lambdaMatch: [
        "test/fake-package/**/*.js",
        "!test/fake-package/**/*cf.js"
      ],
      profile: "fake-profile",
      region: "fake-region",
      bucket: "fake-bucket",
      environments: {
        test: {
          stack: "stack-test"
        }
      }
    };
    utils.loadConfig.mockReturnValue({
      conf,
      packageJson: {
        name: "fake-package",
        dynamic: conf
      }
    });
  });

  it("compiles lambda with webpack", async () => {
    const deploy = require("../../../src/commands/deploy");
    await deploy({ function: "lambda" });
    expect(lambdaExists("lambda")).toBe(true);
    expect(zipExists("lambda.zip")).toBe(true);
    expect(lambdaExists("showUser")).toBe(false);
    expect(zipExists("showUser.zip")).toBe(false);
  });

  it("uploads file to S3", async () => {
    const deploy = require("../../../src/commands/deploy");
    await deploy({ function: "lambda" });

    const uploads = utils.uploadFilesToS3.mock.calls;
    expect(uploads.length).toBe(1);
    expect(uploads[0][1]).toEqual(conf.bucket);
    const uploadFiles = uploads[0][2];
    const uploadFilesKeys = Object.keys(uploadFiles);
    expect(uploadFilesKeys.length).toBe(1);
    expect(uploadFilesKeys[0]).toMatch("dynamic/test/build/lambda.zip");
    expect(uploadFiles[uploadFilesKeys[0]]).toEqual(
      `functions/test/lambda-5cdadd95e5d195a9956a5c7fc92f9135.zip`
    );
  });

  it("runs createChangeSet", async () => {
    const deploy = require("../../../src/commands/deploy");
    await deploy({ function: "lambda" });
    const { calls } = cloudformation.createChangeSet.mock;
    expect(calls.length).toBe(1);
    expect(calls[0][0].UsePreviousTemplate).toEqual(true);
    expect(calls[0][0].StackName).toEqual("stack-test");
    expect(calls[0][0].ChangeSetName).toBeDefined();
    expect(calls[0][0].Parameters).toBeDefined();
    expect(calls[0][0].TemplateBody).toBeUndefined();
    expect(calls[0][0].Parameters).toEqual([
      {
        ParameterKey: "testParam",
        UsePreviousValue: true
      },
      {
        ParameterKey: "operationsS3Bucket",
        UsePreviousValue: true
      },
      {
        ParameterKey: "environment",
        UsePreviousValue: true
      },
      {
        ParameterKey: "lambdaS3Key",
        ParameterValue:
          "functions/test/lambda-5cdadd95e5d195a9956a5c7fc92f9135.zip"
      },
      {
        ParameterKey: "showUserS3Key",
        UsePreviousValue: true
      }
    ]);
  });
});
