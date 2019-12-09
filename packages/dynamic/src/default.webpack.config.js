const path = require("path");
const webpack = require("webpack");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { getDirectories } = require("./utils");

module.exports = (entries, conf) => {
  return {
    mode: "production",
    target: "node",
    entry: entries,
    externals: ["aws-sdk"],
    output: {
      path: path.join(process.cwd(), conf.buildDir),
      libraryTarget: "umd",
      filename: "[name]/index.js",
      library: "[name]"
    },
    plugins: [new CleanWebpackPlugin()]
  };
};
