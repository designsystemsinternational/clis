const utils = require("@designsystemsinternational/cli-utils");
const inquirer = require("inquirer");
const {
  mockOra,
  mockUtils,
  mockInquirer,
  mockExeca
} = require("@designsystemsinternational/cli-utils/test/mock");
const { defaultFileParams } = require("../../../src/utils");

describe("update", () => {
  let conf;
  beforeEach(() => {
    mockOra();
    mockInquirer(inquirer);
    conf = {
      profile: "fake-profile",
      region: "fake-region",
      buildDir: "test/fake-package/build",
      environments: {
        test: {
          stack: "stack-test",
          bucket: "bucket-test",
          fileParams: defaultFileParams
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
    expect(calls.length).toBe(2);

    // Assets
    expect(calls[0][1]).toEqual("test/fake-package/build");
    expect(calls[0][2]).toEqual("bucket-test");
    expect(calls[0][3]).toEqual(defaultFileParams);
    expect(calls[0][4].shouldUpload("test.html")).toEqual(false);

    // HTML
    expect(calls[0][1]).toEqual("test/fake-package/build");
    expect(calls[0][2]).toEqual("bucket-test");
    expect(calls[0][3]).toEqual(defaultFileParams);
    expect(calls[0][4].shouldUpload("test.html")).toEqual(false);
  });

  it("skips prompt with flag", async () => {
    mockUtils(utils, {
      loadConfig: {
        conf,
        packageJson: {
          name: "fake-package"
        }
      }
    });
    const deploy = require("../../../src/commands/deploy");
    await deploy({ confirm: true });
    const { calls } = utils.uploadDirToS3.mock;
    expect(calls.length).toBe(2);
  });
});
