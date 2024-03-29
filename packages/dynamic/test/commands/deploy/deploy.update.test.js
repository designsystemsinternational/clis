const { existsSync } = require("fs");
const { join } = require("path");
const utils = require("@designsystemsinternational/cli-utils");
const ora = require("ora");
const inquirer = require("inquirer");
const { lambdaExists, zipExists } = require("../../utils");
const {
  mockOra,
  mockUtils,
  mockInquirer
} = require("@designsystemsinternational/cli-utils/test/mock");

describe("update", () => {
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
    inquirer.prompt.mockResolvedValueOnce({ testParam: "test-value" });
  });

  it("compiles lambdas with webpack", async () => {
    const deploy = require("../../../src/commands/deploy");
    await deploy();
    expect(lambdaExists("lambda")).toBe(true);
    expect(lambdaExists("showUser")).toBe(true);
    expect(zipExists("lambda.zip")).toBe(true);
    expect(zipExists("showUser.zip")).toBe(true);
  });

  it("uploads files to S3", async () => {
    const deploy = require("../../../src/commands/deploy");
    await deploy();

    const uploads = utils.uploadFilesToS3.mock.calls;
    expect(uploads.length).toBe(1);
    expect(uploads[0][1]).toEqual(conf.bucket);
    const files = uploads[0][2];
    const keys = Object.keys(files);
    expect(keys[0]).toMatch("test/build/lambda.zip");
    expect(keys[1]).toMatch("test/build/showUser.zip");
    expect(files[keys[0]]).toEqual(
      `functions/test/lambda-d245d98cf59449a69d3c183fec4853a2.zip`
    );
    expect(files[keys[1]]).toEqual(
      `functions/test/showUser-0cd2f14dd8e03d9108323073e3241280.zip`
    );
  });

  it("works for package without lambdas", async () => {
    conf.lambdaMatch = ["thisdoesnotexist"];
    const deploy = require("../../../src/commands/deploy");
    await deploy();
    const uploads = utils.uploadFilesToS3.mock.calls;
    expect(uploads.length).toBe(0);
  });

  it("runs createChangeSet", async () => {
    const deploy = require("../../../src/commands/deploy");
    await deploy();

    // createChangeSet
    const { calls } = cloudformation.createChangeSet.mock;
    expect(calls.length).toBe(1);
    expect(calls[0][0].StackName).toEqual("stack-test");
    expect(calls[0][0].ChangeSetName).toBeDefined();
    expect(calls[0][0].TemplateBody).toBeDefined();
    expect(calls[0][0].Parameters).toBeDefined();

    const tmpl = JSON.parse(calls[0][0].TemplateBody);
    expect(Object.keys(tmpl.Parameters)).toEqual([
      "testParam",
      "anotherParam",
      "operationsS3Bucket",
      "environment",
      "lambdaS3Key",
      "showUserS3Key"
    ]);

    expect(tmpl.Conditions.HasParam).toBeDefined();

    expect(Object.keys(tmpl.Resources)).toEqual([
      "testLogGroup",
      "anotherLogGroup"
    ]);

    expect(Object.keys(tmpl.Outputs)).toEqual(["testOutput", "anotherOutput"]);

    expect(calls[0][0].Parameters).toEqual([
      {
        ParameterKey: "testParam",
        ParameterValue: "test-value"
      },
      {
        ParameterKey: "operationsS3Bucket",
        ParameterValue: "fake-bucket"
      },
      {
        ParameterKey: "environment",
        ParameterValue: "test"
      },
      {
        ParameterKey: "lambdaS3Key",
        ParameterValue:
          "functions/test/lambda-d245d98cf59449a69d3c183fec4853a2.zip"
      },
      {
        ParameterKey: "showUserS3Key",
        ParameterValue:
          "functions/test/showUser-0cd2f14dd8e03d9108323073e3241280.zip"
      }
    ]);
  });
});
