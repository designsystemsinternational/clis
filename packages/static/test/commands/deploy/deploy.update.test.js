const utils = require("@designsystemsinternational/cli-utils");
const inquirer = require("inquirer");
const {
  mockOra,
  mockUtils,
  mockInquirer,
  mockExeca
} = require("@designsystemsinternational/cli-utils/test/mock");

describe("update", () => {
  let conf, fileParams;
  beforeEach(() => {
    mockOra();
    mockInquirer(inquirer);
    fileParams = [
      {
        match: "*.json",
        params: {
          ACL: "public-read"
        }
      },
      {
        match: "*.html",
        params: {
          CacheControl: "max-age=500"
        }
      }
    ];
    conf = {
      profile: "fake-profile",
      region: "fake-region",
      buildDir: "test/fake-package/build",
      environments: {
        test: {
          stack: "stack-test",
          bucket: "bucket-test",
          fileParams
        }
      }
    };
  });

  it("uploads files", async () => {
    mockUtils(utils, {
      loadConfig: {
        conf,
        packageJson: {
          name: "fake-package"
        }
      }
    });
    inquirer.prompt.mockResolvedValueOnce({ confirm: true });
    const deploy = require("../../../src/commands/deploy");
    await deploy();
    const { calls } = utils.uploadDirToS3.mock;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toEqual("test/fake-package/build");
    expect(calls[0][2]).toEqual("bucket-test");
    expect(calls[0][3]).toEqual(fileParams);
  });
});
