const utils = require("@designsystemsinternational/cli-utils");
const {
  ACTION_NO_CONFIG,
} = require("@designsystemsinternational/cli-utils/src/constants");
const { mockUtils } = require("../../mock");

describe("deploy", () => {
  describe("deploy", () => {
    it("fails if no static config", async () => {
      mockUtils(utils);
      const deploy = require("../../../src/commands/deploy");
      utils.loadConfig.mockReturnValue({ name: "fake-package" });
      await expect(deploy()).rejects.toEqual(ACTION_NO_CONFIG);
    });
  });
});
