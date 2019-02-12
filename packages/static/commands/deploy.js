const execa = require("execa");

const deploy = async (conf, env) => {
  const envConfig = conf.environments[env];

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

  console.log("here");

  //aws s3 sync ./dist s3://animal-frontend --profile animal --exclude "*.html" --acl "public-read" --cache-control "max-age=31536000"
  //aws s3 sync ./dist s3://animal-frontend --profile animal --exclude "*" --include "*.html" --acl "public-read" --cache-control "max-age=300"
};

module.exports = deploy;
