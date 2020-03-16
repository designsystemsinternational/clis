const { existsSync } = require("fs");
const { join } = require("path");
const utils = require("@designsystemsinternational/cli-utils");
const ora = require("ora");
const inquirer = require("inquirer");
const { NO_STATIC_CONFIG } = require("../../src/utils");
const { mockOra, mockUtils, mockInquirer, mockExeca } = require("../mock");

describe("deploy", () => {
  let cloudformation;
  beforeEach(() => {
    const mockAws = mockUtils(utils);
    cloudformation = mockAws.mockCloudformation;
    mockOra();
    mockInquirer(inquirer);
    mockExeca();
  });

  describe("create stack", () => {
    it("should raise error if no static config", async () => {
      const deploy = require("../../src/commands/deploy");
      utils.loadConfig.mockReturnValue({ name: "fake-package" });
      await expect(deploy()).rejects.toEqual(NO_STATIC_CONFIG);
    });

    it("should create stack if environment is not in config", async () => {
      const conf = {
        profile: "fake-profile",
        region: "fake-region",
        buildDir: "test/build"
      };
      utils.loadConfig.mockReturnValue({
        conf,
        packageJson: {
          name: "fake-package",
          static: conf
        }
      });
      inquirer.prompt
        .mockResolvedValueOnce({
          stackName: "stack-test",
          createCloudfront: true,
          htmlCache: "300",
          assetsCache: "31536000"
        })
        .mockResolvedValueOnce({
          S3BucketName: "test-bucket",
          IndexPage: "index.html",
          ErrorPage: "index.html"
        });

      const deploy = require("../../src/commands/deploy");
      await deploy();

      // Test that inquirer got the questions from parameters
      const inquirerCalls = inquirer.prompt.mock.calls;
      expect(inquirerCalls.length).toBe(2);
      expect(inquirerCalls[0][0].map(a => a.name)).toEqual([
        "stackName",
        "createCloudfront",
        "htmlCache",
        "assetsCache"
      ]);
      expect(inquirerCalls[1][0].map(a => a.name)).toEqual([
        "S3BucketName",
        "IndexPage",
        "ErrorPage"
      ]);

      // createStack
      const { calls } = cloudformation.createStack.mock;
      expect(calls.length).toBe(1);
      expect(calls[0][0].StackName).toEqual("stack-test");
      expect(calls[0][0].TemplateBody).toBeDefined();
      expect(calls[0][0].Parameters).toBeDefined();

      const tmpl = JSON.parse(calls[0][0].TemplateBody);
      expect(Object.keys(tmpl.Parameters)).toEqual([
        "S3BucketName",
        "IndexPage",
        "ErrorPage"
      ]);
      expect(Object.keys(tmpl.Resources)).toEqual([
        "S3Bucket",
        "CloudfrontDistribution"
      ]);
      expect(Object.keys(tmpl.Outputs)).toEqual(["S3URL", "CloudfrontURL"]);
      expect(calls[0][0].Parameters).toEqual([
        {
          ParameterKey: "S3BucketName",
          ParameterValue: "test-bucket"
        },
        {
          ParameterKey: "IndexPage",
          ParameterValue: "index.html"
        },
        {
          ParameterKey: "ErrorPage",
          ParameterValue: "index.html"
        }
      ]);

      // Config save
      const saveCalls = utils.saveEnvironmentConfig.mock.calls;
      expect(saveCalls.length).toBe(1);
      expect(saveCalls[0][0]).toEqual("static");
      expect(saveCalls[0][1]).toEqual("test");
      expect(saveCalls[0][2]).toEqual({
        stack: "stack-test",
        bucket: "test-bucket",
        htmlCache: "300",
        assetsCache: "31536000"
      });
    });

    it("should not create cloudfront", async () => {
      const conf = {
        profile: "fake-profile",
        region: "fake-region",
        buildDir: "test/build"
      };
      utils.loadConfig.mockReturnValue({
        conf,
        packageJson: {
          name: "fake-package",
          static: conf
        }
      });
      inquirer.prompt
        .mockResolvedValueOnce({
          stackName: "stack-test",
          createCloudfront: false,
          htmlCache: "300",
          assetsCache: "31536000"
        })
        .mockResolvedValueOnce({
          S3BucketName: "test-bucket",
          IndexPage: "index.html",
          ErrorPage: "index.html"
        });

      const deploy = require("../../src/commands/deploy");
      await deploy();

      // createStack
      const { calls } = cloudformation.createStack.mock;
      expect(calls.length).toBe(1);
      expect(calls[0][0].StackName).toEqual("stack-test");
      expect(calls[0][0].TemplateBody).toBeDefined();
      expect(calls[0][0].Parameters).toBeDefined();

      const tmpl = JSON.parse(calls[0][0].TemplateBody);
      expect(Object.keys(tmpl.Resources)).toEqual(["S3Bucket"]);
      expect(Object.keys(tmpl.Outputs)).toEqual(["S3URL"]);
    });
  });

  describe("upload files", () => {
    it("should upload files if environment is in config", async () => {
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
      const execa = require("execa");
      const deploy = require("../../src/commands/deploy");
      await deploy();
      const { calls } = execa.mock;
      expect(calls.length).toBe(2);
    });
  });
});
