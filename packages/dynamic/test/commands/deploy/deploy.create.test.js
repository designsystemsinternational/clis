const utils = require("@designsystemsinternational/cli-utils");
const ora = require("ora");
const inquirer = require("inquirer");
const { lambdaExists, zipExists } = require("../../utils");
const {
  mockOra,
  mockUtils,
  mockInquirer
} = require("@designsystemsinternational/cli-utils/test/mock");

describe("create", () => {
  let cloudformation;
  beforeEach(() => {
    const mockAws = mockUtils(utils);
    cloudformation = mockAws.mockCloudformation;
    mockOra(ora);
    mockInquirer(inquirer);
  });

  describe("success", () => {
    let conf;
    beforeEach(() => {
      conf = {
        buildDir: "test/build",
        cloudformationMatch: ["test/fake-package/**/*cf.js"],
        lambdaMatch: [
          "test/fake-package/**/*.js",
          "!test/fake-package/**/*cf.js"
        ],
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
    });

    it("compiles lambdas with webpack", async () => {
      const deploy = require("../../../src/commands/deploy");
      await deploy();
      expect(lambdaExists("lambda")).toBe(true);
      expect(lambdaExists("showUser")).toBe(true);
      expect(zipExists("lambda.zip")).toBe(true);
      expect(zipExists("showUser.zip")).toBe(true);
    });

    it("uploads files to S3", async () => {
      const deploy = require("../../../src/commands/deploy");
      await deploy();

      const uploads = utils.uploadFilesToS3.mock.calls;
      expect(uploads.length).toBe(1);
      expect(uploads[0][1]).toEqual(conf.bucket);
      const files = uploads[0][2];
      const keys = Object.keys(files);
      expect(keys[0]).toMatch("test/build/lambda.zip");
      expect(keys[1]).toMatch("test/build/showUser.zip");
      expect(files[keys[0]]).toEqual(
        `functions/test/lambda-5cdadd95e5d195a9956a5c7fc92f9135.zip`
      );
      expect(files[keys[1]]).toEqual(
        `functions/test/showUser-24ab93dda504c29203080cee6df361a1.zip`
      );
    });

    it("runs createStack", async () => {
      const deploy = require("../../../src/commands/deploy");
      await deploy();

      const { calls } = cloudformation.createStack.mock;
      expect(calls.length).toBe(1);
      expect(calls[0][0].StackName).toEqual("stack-test");

      const tmpl = JSON.parse(calls[0][0].TemplateBody);
      expect(Object.keys(tmpl.Parameters)).toEqual([
        "testParam",
        "anotherParam",
        "operationsS3Bucket",
        "environment",
        "lambdaS3Key",
        "showUserS3Key"
      ]);
      expect(Object.keys(tmpl.Resources)).toEqual([
        "testLogGroup",
        "anotherLogGroup"
      ]);
      expect(Object.keys(tmpl.Outputs)).toEqual([
        "testOutput",
        "anotherOutput"
      ]);

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
        },
        {
          ParameterKey: "showUserS3Key",
          ParameterValue:
            "functions/test/showUser-24ab93dda504c29203080cee6df361a1.zip"
        }
      ]);
    });

    it("saves environment to config file", async () => {
      const deploy = require("../../../src/commands/deploy");
      await deploy();

      const saveCalls = utils.saveEnvironmentConfig.mock.calls;
      expect(saveCalls.length).toBe(1);
      expect(saveCalls[0][0]).toEqual("dynamic");
      expect(saveCalls[0][1]).toEqual("test");
      expect(saveCalls[0][2]).toEqual({ stack: "stack-test" });
    });
  });
});
