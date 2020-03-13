const { existsSync } = require("fs");
const { join } = require("path");
const utils = require("@designsystemsinternational/cli-utils");
const ora = require("ora");
const inquirer = require("inquirer");
const { NO_DYNAMIC_CONFIG } = require("../../src/utils");
const { mockOra, mockUtils, mockInquirer } = require("../mock");

describe("deploy", () => {
  let cloudformation;
  beforeEach(() => {
    const mockAws = mockUtils(utils);
    cloudformation = mockAws.mockCloudformation;
    mockOra(ora);
    mockInquirer(inquirer);
  });

  describe("create stack", () => {
    it("should raise error if no dynamic config", async () => {
      const deploy = require("../../src/commands/deploy");
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
      inquirer.prompt
        .mockResolvedValueOnce({ confirm: true })
        .mockResolvedValueOnce({ stackName: "stack-test" })
        .mockResolvedValueOnce({ testParam: "test-value" });

      const deploy = require("../../src/commands/deploy");
      await deploy();

      // Test that inquirer got the questions from parameters
      const inquirerCalls = inquirer.prompt.mock.calls;
      expect(inquirerCalls.length).toBe(3);
      expect(inquirerCalls[0][0][0].name).toEqual("confirm");
      expect(inquirerCalls[1][0][0].name).toEqual("stackName");
      expect(inquirerCalls[2][0][0].name).toEqual("testParam");

      // file creation
      expect(lambdaExists("index.js")).toBe(true);
      expect(zipExists("lambda.zip")).toBe(true);

      // S3 upload
      const uploads = utils.uploadFilesToS3.mock.calls;
      expect(uploads.length).toBe(1);
      expect(uploads[0][1]).toEqual("fake-bucket");
      const uploadFiles = uploads[0][2];
      const uploadFilesKeys = Object.keys(uploadFiles);
      expect(uploadFilesKeys[0]).toMatch(
        "@designsystemsinternational/dynamic/test/build/lambda.zip"
      );
      expect(uploadFiles[uploadFilesKeys[0]]).toEqual(
        `functions/test/lambda-5cdadd95e5d195a9956a5c7fc92f9135.zip`
      );

      // createStack
      const { calls } = cloudformation.createStack.mock;
      expect(calls.length).toBe(1);
      expect(calls[0][0].StackName).toEqual("stack-test");
      expect(calls[0][0].TemplateBody).toBeDefined();
      expect(calls[0][0].Parameters).toBeDefined();

      const tmpl = JSON.parse(calls[0][0].TemplateBody);
      expect(Object.keys(tmpl.Parameters)).toEqual([
        "testParam",
        "operationsS3Bucket",
        "environment",
        "lambdaS3Key"
      ]);
      expect(Object.keys(tmpl.Resources)).toEqual(["testLogGroup"]);
      expect(Object.keys(tmpl.Outputs)).toEqual(["testOutput"]);
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
            "functions/test/lambda-5cdadd95e5d195a9956a5c7fc92f9135.zip"
        }
      ]);

      // Config save
      const saveCalls = utils.saveConfig.mock.calls;
      expect(saveCalls.length).toBe(1);
      expect(saveCalls[0][0]).toEqual("dynamic");
      expect(saveCalls[0][1].environments).toEqual({
        test: { stackName: "stack-test" }
      });
    });
  });

  describe("update stack", () => {
    it("should update stack if environment is in config", async () => {
      const conf = {
        buildDir: "test/build",
        cloudformationMatch: ["test/fake-package/cf.js"],
        lambdaMatch: ["test/fake-package/lambda.js"],
        profile: "fake-profile",
        region: "fake-region",
        bucket: "fake-bucket",
        environments: {
          test: {
            stackName: "stack-test"
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

      const deploy = require("../../src/commands/deploy");
      await deploy();

      // Test that inquirer got the questions from parameters
      const inquirerCalls = inquirer.prompt.mock.calls;
      expect(inquirerCalls.length).toBe(1);
      expect(inquirerCalls[0][0][0].name).toEqual("testParam");

      // file creation
      expect(lambdaExists("index.js")).toBe(true);
      expect(zipExists("lambda.zip")).toBe(true);

      // S3 upload
      const uploads = utils.uploadFilesToS3.mock.calls;
      expect(uploads.length).toBe(1);
      expect(uploads[0][1]).toEqual("fake-bucket");
      const uploadFiles = uploads[0][2];
      const uploadFilesKeys = Object.keys(uploadFiles);
      expect(uploadFilesKeys[0]).toMatch(
        "@designsystemsinternational/dynamic/test/build/lambda.zip"
      );
      expect(uploadFiles[uploadFilesKeys[0]]).toEqual(
        `functions/test/lambda-5cdadd95e5d195a9956a5c7fc92f9135.zip`
      );

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
        "operationsS3Bucket",
        "environment",
        "lambdaS3Key"
      ]);
      expect(Object.keys(tmpl.Resources)).toEqual(["testLogGroup"]);
      expect(Object.keys(tmpl.Outputs)).toEqual(["testOutput"]);
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
            "functions/test/lambda-5cdadd95e5d195a9956a5c7fc92f9135.zip"
        }
      ]);
    });
  });

  describe("update function", () => {
    it("should update function if environment is in config and function name is provided", async () => {
      const conf = {
        buildDir: "test/build",
        cloudformationMatch: ["test/fake-package/cf.js"],
        lambdaMatch: ["test/fake-package/lambda.js"],
        profile: "fake-profile",
        region: "fake-region",
        bucket: "fake-bucket",
        environments: {
          test: {
            stackName: "stack-test"
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

      const deploy = require("../../src/commands/deploy");
      await deploy(["", "", "", "lambda"]);

      // file creation
      expect(lambdaExists("index.js")).toBe(true);
      expect(zipExists("lambda.zip")).toBe(true);

      // S3 upload
      const uploads = utils.uploadFilesToS3.mock.calls;
      expect(uploads.length).toBe(1);
      expect(uploads[0][1]).toEqual("fake-bucket");
      const uploadFiles = uploads[0][2];
      const uploadFilesKeys = Object.keys(uploadFiles);
      expect(uploadFilesKeys[0]).toMatch(
        "@designsystemsinternational/dynamic/test/build/lambda.zip"
      );
      expect(uploadFiles[uploadFilesKeys[0]]).toEqual(
        `functions/test/lambda-5cdadd95e5d195a9956a5c7fc92f9135.zip`
      );

      // createChangeSet
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
        }
      ]);
    });
  });
});

const lambdaExists = filename =>
  existsSync(join(__dirname, "..", "build", "lambda", filename));

const zipExists = filename =>
  existsSync(join(__dirname, "..", "build", filename));
