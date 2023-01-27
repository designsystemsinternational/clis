const { getBaseNameForFunction } = require("../../src/utils.js");

describe("utils", () => {
  describe("getBaseNameForFunction", () => {
    it("correctly figures out the base name for allowed extensions", () => {
      expect(getBaseNameForFunction("some/nested/path/lambda.js")).toEqual(
        "lambda"
      );
      expect(getBaseNameForFunction("some/nested/path/lambda.cjs")).toEqual(
        "lambda"
      );
      expect(getBaseNameForFunction("some/nested/path/lambda.mjs")).toEqual(
        "lambda"
      );
    });

    // TODO: should we consider throwing, to be on the safe side?
    it("should pass through non allowed extensions", () => {
      expect(getBaseNameForFunction("some/nested/path/lambda.ts")).toEqual(
        "lambda.ts"
      );
    });
  });
});
