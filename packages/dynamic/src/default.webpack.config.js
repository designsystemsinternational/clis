const path = require("path");
const webpack = require("webpack");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = (entries, conf) => {
  return {
    mode: "production",
    target: "node",
    entry: entries,
    externals: ["aws-sdk", ...conf.externalPackages],
    output: {
      path: path.join(process.cwd(), conf.buildDir),
      libraryTarget: "umd",
      filename: "[name]/index.js",
      library: "[name]"
    },
    plugins: [new CleanWebpackPlugin()]
  };
};
