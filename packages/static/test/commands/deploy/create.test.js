const { existsSync } = require("fs");
const { join } = require("path");
const utils = require("@designsystemsinternational/cli-utils");
const ora = require("ora");
const inquirer = require("inquirer");
const { NO_STATIC_CONFIG } = require("../../../src/utils");
const { mockOra, mockUtils, mockInquirer, mockExeca } = require("../../mock");

describe("deploy", () => {
  let cloudformation, conf;
  beforeEach(() => {
    const mockAws = mockUtils(utils);
    cloudformation = mockAws.mockCloudformation;
    mockOra();
    mockInquirer(inquirer);
    mockExeca();
    conf = {
      profile: "fake-profile",
      region: "fake-region",
      buildDir: "test/build"
    };
  });

  describe("create stack", () => {
    it("should raise error if no static config", async () => {
      const deploy = require("../../../src/commands/deploy");
      utils.loadConfig.mockReturnValue({ name: "fake-package" });
      await expect(deploy()).rejects.toEqual(NO_STATIC_CONFIG);
    });

    it("saves environment in config", async () => {
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

      const deploy = require("../../../src/commands/deploy");
      await deploy();

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

    it("runs createStack", async () => {
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

      const deploy = require("../../../src/commands/deploy");
      await deploy();

      const { calls } = cloudformation.createStack.mock;
      expect(calls.length).toBe(1);
      expect(calls[0][0].StackName).toEqual("stack-test");

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
    });

    it("does not create cloudfront", async () => {
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

      const deploy = require("../../../src/commands/deploy");
      await deploy();

      const { calls } = cloudformation.createStack.mock;
      const tmpl = JSON.parse(calls[0][0].TemplateBody);
      expect(Object.keys(tmpl.Resources)).toEqual(["S3Bucket"]);
      expect(Object.keys(tmpl.Outputs)).toEqual(["S3URL"]);
    });
  });
});
