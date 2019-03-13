const execa = require("execa");

const deploy = async (conf, env) => {
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
