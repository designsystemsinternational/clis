const utils = require("@designsystemsinternational/cli-utils");
const {
  ACTION_NO_CONFIG
} = require("@designsystemsinternational/cli-utils/src/constants");
const { mockUtils } = require("../../mock");

describe("deploy", () => {
  describe("error", () => {
    it("fails if no dynamic config", async () => {
      mockUtils(utils);
      utils.loadConfig.mockReturnValue({ name: "fake-package" });
      const deploy = require("../../../src/commands/deploy");
      await expect(deploy()).rejects.toEqual(ACTION_NO_CONFIG);
    });
  });
});
