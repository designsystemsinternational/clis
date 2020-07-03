const { existsSync } = require("fs");
const { join } = require("path");
const ora = require("ora");
const inquirer = require("inquirer");
const utils = require("@designsystemsinternational/cli-utils");
const {
  mockOra,
  mockUtils,
  mockInquirer,
  mockExeca,
} = require("@designsystemsinternational/cli-utils/test/mock");
const {
  expectSaveEnvironmentConfig,
  expectCreateStack,
} = require("@designsystemsinternational/cli-utils/test/expectations");

describe("deploy", () => {
  let aws, cloudformation, conf;
  beforeEach(() => {
    aws = mockUtils(utils, {
      loadConfig: {
        conf: {
          profile: "fake-profile",
          region: "fake-region",
          buildDir: "test/build",
        },
        packageJson: {
          name: "fake-package",
        },
      },
      describeStacks: {
        Stacks: [
          {
            Outputs: [{ OutputKey: "a", OutputValue: "b", Description: "c" }],
          },
        ],
      },
    });
    console.log(aws.mockCloudformation.createStack);
    cloudformation = aws.mockCloudformation;
    mockOra();
    mockInquirer(inquirer);
    mockExeca();
  });

  describe("create stack", () => {
    it("saves environment in config", async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          stackName: "stack-test",
          createCloudfront: true,
          htmlCache: "300",
          assetsCache: "31536000",
        })
        .mockResolvedValueOnce({
          S3BucketName: "test-bucket",
          IndexPage: "index.html",
          ErrorPage: "index.html",
        });

      const deploy = require("../../../src/commands/deploy");
      await deploy();
      expectSaveEnvironmentConfig(utils, "static", "test", {
        stack: "stack-test",
        bucket: "test-bucket",
        htmlCache: "300",
        assetsCache: "31536000",
      });
    });

    it.only("runs createStack", async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          stackName: "stack-test",
          createCloudfront: true,
          htmlCache: "300",
          assetsCache: "31536000",
        })
        .mockResolvedValueOnce({
          S3BucketName: "test-bucket",
          IndexPage: "index.html",
          ErrorPage: "index.html",
        });

      const deploy = require("../../../src/commands/deploy");
      await deploy();

      const call = expectCreateStack(aws, "stack-test");
      const tmpl = JSON.parse(call[0].TemplateBody);
      expect(Object.keys(tmpl.Resources)).toEqual([
        "S3Bucket",
        "CloudfrontDistribution",
      ]);
      expect(Object.keys(tmpl.Outputs)).toEqual(["S3URL", "CloudfrontURL"]);
      expect(call[0].Parameters).toEqual([
        {
          ParameterKey: "S3BucketName",
          ParameterValue: "test-bucket",
        },
        {
          ParameterKey: "IndexPage",
          ParameterValue: "index.html",
        },
        {
          ParameterKey: "ErrorPage",
          ParameterValue: "index.html",
        },
      ]);
    });

    it("does not create cloudfront", async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          stackName: "stack-test",
          createCloudfront: false,
          htmlCache: "300",
          assetsCache: "31536000",
        })
        .mockResolvedValueOnce({
          S3BucketName: "test-bucket",
          IndexPage: "index.html",
          ErrorPage: "index.html",
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
