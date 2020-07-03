const { existsSync } = require("fs");
const { join } = require("path");
const utils = require("@designsystemsinternational/cli-utils");
const ora = require("ora");
const execa = require("execa");
const inquirer = require("inquirer");
const {
  mockOra,
  mockUtils,
  mockInquirer,
  mockExeca,
} = require("@designsystemsinternational/cli-utils/test/mock");
const {
  expectDeleteStack,
  expectDeleteEnvironmentConfig,
  expectEmptyS3Bucket,
} = require("@designsystemsinternational/cli-utils/test/expectations");

describe("destroy", () => {
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
              htmlCache: "300",
              assetsCache: "31536000",
            },
          },
        },
        packageJson: {
          name: "fake-package",
        },
      },
    });
    mockOra();
    mockInquirer(inquirer);
  });

  it("should delete stack", async () => {
    inquirer.prompt.mockResolvedValueOnce({ confirm: true });

    const destroy = require("../../src/commands/destroy");
    await destroy();

    expectEmptyS3Bucket(utils, "bucket-test");
    expectDeleteStack(aws, "stack-test");
    expectDeleteEnvironmentConfig(utils, "static", "test");
  });
});
