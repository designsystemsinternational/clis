const { existsSync } = require("fs");
const { join } = require("path");
const ora = require("ora");
const inquirer = require("inquirer");
const utils = require("@designsystemsinternational/cli-utils");
const {
  mockOra,
  mockUtils,
  mockInquirer,
  mockExeca
} = require("@designsystemsinternational/cli-utils/test/mock");
const {
  expectSaveEnvironmentConfig,
  expectUpdateStack,
  expectParameters
} = require("@designsystemsinternational/cli-utils/test/expectations");
const { defaultFileParams } = require("../../../src/utils");

describe("deploy", () => {
  let aws;
  beforeEach(() => {
    aws = mockUtils(utils, {
      loadConfig: {
        conf: {
          profile: "fake-profile",
          region: "fake-region",
          buildDir: "test/build",
          environments: {
            test: {
              stack: "stack-test",
              bucket: "bucket-test",
              fileParams: defaultFileParams
            }
          }
        },
        packageJson: {
          name: "fake-package"
        }
      },
      describeStacks: {
        Stacks: [
          {
            Outputs: [{ OutputKey: "a", OutputValue: "b", Description: "c" }]
          }
        ]
      }
    });
    mockOra();
    mockInquirer(inquirer);
    mockExeca();
  });

  describe("create stack", () => {
    it("updates the environment config", async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          auth: false,
          createCloudfront: true
        })
        .mockResolvedValueOnce({
          S3BucketName: "test-bucket-changed",
          IndexPage: "index.html",
          ErrorPage: "index.html"
        });

      const deploy = require("../../../src/commands/deploy");
      await deploy({ configure: true });
      expectSaveEnvironmentConfig(utils, "static", "test", {
        stack: "stack-test",
        bucket: "test-bucket-changed",
        fileParams: defaultFileParams
      });
    });

    it("runs updateStack", async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          stack: "stack-test",
          auth: false,
          createCloudfront: false
        })
        .mockResolvedValueOnce({
          S3BucketName: "test-bucket",
          IndexPage: "index.html",
          ErrorPage: "index.html"
        });

      const deploy = require("../../../src/commands/deploy");
      await deploy({ configure: true });

      const [call, tmpl] = expectUpdateStack(aws, "stack-test");
      expect(Object.keys(tmpl.Resources)).toEqual(["S3Bucket"]);
      expect(Object.keys(tmpl.Outputs)).toEqual(["S3URL"]);
      expectParameters(call[0].Parameters, {
        S3BucketName: "test-bucket",
        IndexPage: "index.html",
        ErrorPage: "index.html",
        environment: "test"
      });
    });
  });
});
