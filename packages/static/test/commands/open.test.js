const { existsSync } = require("fs");
const { join } = require("path");
const utils = require("@designsystemsinternational/cli-utils");
const ora = require("ora");
const inquirer = require("inquirer");
const {
  mockOra,
  mockExeca,
  mockUtils,
  mockInquirer
} = require("@designsystemsinternational/cli-utils/test/mock");
const {
  expectDeleteStack,
  expectDeleteEnvironmentConfig,
  expectEmptyS3Bucket
} = require("@designsystemsinternational/cli-utils/test/expectations");

describe("open", () => {
  let aws;
  const s3URL = "http://stack-test.s3-website-fake-region.amazonaws.com",
    cloudfrontURL = "https://abcde.cloudfront.net";
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
              bucket: "bucket-test"
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
            Outputs: [
              {
                OutputKey: "S3URL",
                OutputValue: s3URL,
                Description:
                  "The URL of the S3 website. Use this to bypass caching."
              },
              {
                OutputKey: "CloudfrontURL",
                OutputValue: cloudfrontURL,
                Description:
                  "The URL of the cached Cloudfront website. Use this for production."
              }
            ]
          }
        ]
      }
    });
    mockOra();
    mockInquirer(inquirer);
    mockExeca();
  });

  it("should offer option to choose urls if key isn't provided", async () => {
    const open = require("../../src/commands/open");
    const url = await open({});
    inquirer.prompt.mockResolvedValueOnce({
      OutputValue: "S3URL"
    });
    expect(url).toBe(s3URL);
  });

  it("should open s3 url", async () => {
    const open = require("../../src/commands/open");
    const url = await open({ search: "s3" });
    expect(url).toBe(s3URL);
  });

  it("should open cloudfront url", async () => {
    const open = require("../../src/commands/open");
    const url = await open({ search: "cloud" });
    expect(url).toBe(cloudfrontURL);
    const url2 = await open({ search: "cloudfront" });
    expect(url2).toBe(cloudfrontURL);
  });

  it("should open url with a custom path", async () => {
    const path = "/my-custom-path?total=1000";
    const open = require("../../src/commands/open");
    const url = await open({ search: "s3", path });
    expect(url).toBe(s3URL + path);
  });
});
