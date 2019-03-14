const execa = require("execa");
const { hasConfig, hasEnv, loadConfig } = require("../utils");

const deploy = async args => {
  if (!args[3]) {
    return console.error("Please state which environment to deploy to");
  }

  const conf = loadConfig();
  const env = args[3];

  if (!hasEnv(conf, env)) {
    console.error("This environment does not exist");
    process.exit();
  }

  const envConfig = conf.environments[env];

  // Run build command if needed
  if (conf.shouldRunBuildCommand) {
    await execa.shell(conf.buildCommand, {
      stdout: "inherit"
    });
  }

  // Sync assets
  await execa(
    "aws",
    [
      "s3",
      "sync",
      `./${conf.buildFolder}`,
      `s3://${envConfig.bucket}`,
      "--profile",
      conf.awsProfile,
      "--region",
      conf.awsRegion,
      "--exclude",
      "*.html",
      "--acl",
      "public-read",
      "--cache-control",
      `max-age=${envConfig.assetsCache}`
    ],
    {
      stdout: "inherit"
    }
  );

  // Sync HTML
  await execa(
    "aws",
    [
      "s3",
      "sync",
      `./${conf.buildFolder}`,
      `s3://${envConfig.bucket}`,
      "--profile",
      conf.awsProfile,
      "--region",
      conf.awsRegion,
      "--exclude",
      "*",
      "--include",
      "*.html",
      "--acl",
      "public-read",
      "--cache-control",
      `max-age=${envConfig.htmlCache}`
    ],
    {
      stdout: "inherit"
    }
  );

  console.log("Deployed!");
};

module.exports = deploy;
