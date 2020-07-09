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
  expectCreateStack,
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
          buildDir: "test/build"
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
    it("saves environment in config", async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          stack: "stack-test",
          createCloudfront: true
        })
        .mockResolvedValueOnce({
          S3BucketName: "test-bucket",
          IndexPage: "index.html",
          ErrorPage: "index.html"
        });

      const deploy = require("../../../src/commands/deploy");
      await deploy();
      expectSaveEnvironmentConfig(utils, "static", "test", {
        stack: "stack-test",
        bucket: "test-bucket",
        fileParams: defaultFileParams
      });
    });

    it("runs createStack", async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          stack: "stack-test",
          createCloudfront: true
        })
        .mockResolvedValueOnce({
          S3BucketName: "test-bucket",
          IndexPage: "index.html",
          ErrorPage: "index.html"
        });

      const deploy = require("../../../src/commands/deploy");
      await deploy();

      const [call, tmpl] = expectCreateStack(aws, "stack-test");
      expect(Object.keys(tmpl.Resources)).toEqual([
        "S3Bucket",
        "CloudfrontDistribution"
      ]);
      expect(Object.keys(tmpl.Outputs)).toEqual(["S3URL", "CloudfrontURL"]);
      expectParameters(call[0].Parameters, {
        S3BucketName: "test-bucket",
        IndexPage: "index.html",
        ErrorPage: "index.html",
        environment: "test"
      });
    });

    it("uses dynamic defaults for inquirer prompt", async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          stack: "stack-test",
          createCloudfront: true
        })
        .mockResolvedValueOnce({
          S3BucketName: "test-bucket",
          IndexPage: "index.html",
          ErrorPage: "index.html"
        });

      const deploy = require("../../../src/commands/deploy");
      await deploy();

      const { calls } = inquirer.prompt.mock;
      expect(calls[0][0][0]).toMatchObject({
        name: "stack",
        default: "fake-package-test"
      });
      expect(calls[1][0][0]).toMatchObject({
        name: "S3BucketName",
        default: "stack-test"
      });
    });

    it("does not create cloudfront", async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          stack: "stack-test",
          createCloudfront: false
        })
        .mockResolvedValueOnce({
          S3BucketName: "test-bucket",
          IndexPage: "index.html",
          ErrorPage: "index.html"
        });

      const deploy = require("../../../src/commands/deploy");
      await deploy();

      const [call, tmpl] = expectCreateStack(aws, "stack-test");
      expect(Object.keys(tmpl.Resources)).toEqual(["S3Bucket"]);
      expect(Object.keys(tmpl.Outputs)).toEqual(["S3URL"]);
    });

    it("enables basic auth", async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          stack: "stack-test",
          auth: true
        })
        .mockResolvedValueOnce({
          S3BucketName: "test-bucket",
          IndexPage: "index.html",
          ErrorPage: "index.html",
          AuthUsername: "user",
          AuthPassword: "password"
        });

      const deploy = require("../../../src/commands/deploy");
      await deploy();

      const [call, tmpl] = expectCreateStack(aws, "stack-test");
      expect(Object.keys(tmpl.Resources)).toEqual([
        "S3Bucket",
        "CloudfrontDistribution",
        "AuthLambdaRole",
        "AuthLambda",
        "VersionedAuthLambda",
        "AuthLambdaLogGroup"
      ]);
      const cacheKeys = Object.keys(
        tmpl.Resources.CloudfrontDistribution.Properties.DistributionConfig
          .DefaultCacheBehavior
      );
      expect(cacheKeys).toContain("LambdaFunctionAssociations");
      expectParameters(call[0].Parameters, {
        S3BucketName: "test-bucket",
        IndexPage: "index.html",
        ErrorPage: "index.html",
        AuthUsername: "user",
        AuthPassword: "password",
        environment: "test"
      });
    });

    it("enables custom domain", async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          stack: "stack-test",
          domain: true
        })
        .mockResolvedValueOnce({
          S3BucketName: "test-bucket",
          IndexPage: "index.html",
          ErrorPage: "index.html",
          Domain: "test.designsystems.international",
          HostedZoneID: "ABCDEFGH"
        });

      const deploy = require("../../../src/commands/deploy");
      await deploy();

      const [call, tmpl] = expectCreateStack(aws, "stack-test");
      expect(Object.keys(tmpl.Resources)).toEqual([
        "S3Bucket",
        "CloudfrontDistribution",
        "Route53Record",
        "Certificate"
      ]);
      const distKeys = Object.keys(
        tmpl.Resources.CloudfrontDistribution.Properties.DistributionConfig
      );
      expect(distKeys).toContain("Aliases");
      expect(distKeys).toContain("ViewerCertificate");
      expectParameters(call[0].Parameters, {
        S3BucketName: "test-bucket",
        IndexPage: "index.html",
        ErrorPage: "index.html",
        Domain: "test.designsystems.international",
        HostedZoneID: "ABCDEFGH",
        environment: "test"
      });
    });
  });
});
