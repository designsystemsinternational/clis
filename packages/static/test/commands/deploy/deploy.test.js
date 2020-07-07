const utils = require("@designsystemsinternational/cli-utils");
const {
  ACTION_NO_CONFIG,
} = require("@designsystemsinternational/cli-utils/src/constants");
const {
  mockUtils,
} = require("@designsystemsinternational/cli-utils/test/mock");

describe("deploy", () => {
  describe("deploy", () => {
    it("fails if no static config", async () => {
      mockUtils(utils, {
        loadConfig: { packageJson: { name: "fake-package" } },
      });
      const deploy = require("../../../src/commands/deploy");
      await expect(deploy()).rejects.toEqual(ACTION_NO_CONFIG);
    });
  });
});
