const md5File = require("md5-file/promise");
const { join, basename } = require("path");
const {
  accessSync,
  readFileSync,
  writeFileSync,
  createReadStream,
  createWriteStream
} = require("fs");
const archiver = require("archiver");
const recursiveReadDir = require("recursive-readdir");
const webpack = require("webpack");
const defaultConfig = require("./default.webpack.config");
const chalk = require("chalk");
const AWS = require("aws-sdk");

// Config file utils
// ---------------------------------------------------

const loadConfig = () => {
  const pack = JSON.parse(readFileSync("./package.json"));

  if (!pack.name) {
    console.error(
      chalk.red(
        `Your package.json file must have a name to deploy with dynamic`
      )
    );
  }

  return { name: pack.name, conf: pack.dynamic };
};

const saveConfig = conf => {
  const pack = JSON.parse(readFileSync("./package.json"));
  pack.dynamic = conf;
  writeFileSync("./package.json", JSON.stringify(pack, null, 2));
};

// AWS utils
// ---------------------------------------------------

const getAWSWithProfile = (profile, region) => {
  AWS.config.update({
    region,
    credentials: new AWS.SharedIniFileCredentials({ profile })
  });
  return AWS;
};

const awsRegions = {
  "us-east-1": "us-east-1 (N. Virginia)",
  "us-east-2": "us-east-2 (Ohio)",
  "us-west-1": "us-west-1 (N. California)",
  "us-west-2": "us-west-2 (Oregon)",
  "ap-south-1": "ap-south-1 (Mumbai)",
  "ap-northeast-1": "ap-northeast-1 (Tokyo)",
  "ap-northeast-2": "ap-northeast-2 (Seoul)",
  "ap-northeast-3": "ap-northeast-3 (Osaka)",
  "ap-southeast-1": "ap-southeast-1 (Singapore)",
  "ap-southeast-2": "ap-southeast-2 (Sydney)",
  "ca-central-1": "ca-central-1 (Canada)",
  "cn-north-1": "cn-north-1 (Beijing)",
  "cn-northwest-1": "cn-northwest-1 (Ningxia)",
  "eu-central-1": "eu-central-1 (Frankfurt)",
  "eu-west-1": "eu-west-1 (Ireland)",
  "eu-west-2": "eu-west-2 (London)",
  "eu-west-3": "eu-west-3 (Paris)",
  "eu-north-1": "eu-north-1 (Stockholm)",
  "sa-east-1": "sa-east-1 (São Paulo)"
};

// Lambda utils
// ---------------------------------------------------

// This will return every file in /functions not named cf.js
// We do this to not have a config file where you declare your functions, but it
// requires the repo to not have two functions named the same AND not have utils
// files inside of the /functions folder. Let's reconsider after using for a while.
const getFunctions = async () => {
  return await recursiveReadDir(join(process.cwd(), "functions"), [
    "node_modules",
    "cf.js"
  ]);
};

const buildFunctions = async (files, buildFolder) => {
  const entries = {};
  files.forEach(f => (entries[basename(f, ".js")] = f));
  return new Promise((resolve, reject) => {
    webpack(defaultConfig(entries, buildFolder), (err, stats) => {
      if (err || stats.hasErrors()) {
        console.error("Webpack build had errors:", stats.toJson("minimal"));
        reject(err || stats.hasErrors());
      } else {
        resolve(stats.toJson());
      }
    });
  });
};

const zipFile = async (orgFile, zipFile) =>
  new Promise((resolve, reject) => {
    const zip = createWriteStream(zipFile);
    const archive = archiver("zip", {
      zlib: { level: 9 }
    });
    zip.on("close", resolve);
    zip.on("warning", reject);
    zip.on("error", reject);
    archive.pipe(zip);
    archive.append(createReadStream(orgFile), { name: basename(orgFile) });
    archive.finalize();
  });

const zipWebpackOutput = async stats => {
  const { assetsByChunkName, outputPath } = stats;

  const zipInfo = {};
  Object.keys(assetsByChunkName).forEach(key => {
    zipInfo[key] = {
      orgFile: join(outputPath, assetsByChunkName[key]),
      zipFile: join(outputPath, key + ".zip")
    };
  });

  const promises = Object.keys(zipInfo).map(key =>
    zipFile(zipInfo[key].orgFile, zipInfo[key].zipFile)
  );
  await Promise.all(promises);
  return zipInfo;
};

const uploadZip = async (AWS, bucket, localFile, s3Key) => {
  const s3 = new AWS.S3();
  const stream = createReadStream(localFile);
  await s3.upload({ Bucket: bucket, Key: s3Key, Body: stream }).promise();
};

const uploadZips = async (AWS, bucket, environment, zipInfo) => {
  // Get md5 checksum of original file to use for remote path
  Object.keys(zipInfo).forEach(key => {
    const hash = md5File.sync(zipInfo[key].orgFile);
    zipInfo[key].s3Key = `functions/${environment}/${key}-${hash}.zip`;
  });

  // Upload everything
  const promises = Object.keys(zipInfo).map(key =>
    uploadZip(AWS, bucket, zipInfo[key].zipFile, zipInfo[key].s3Key)
  );
  await Promise.all(promises);

  return zipInfo;
};

// S3 Utils
// ---------------------------------------------------

const checkS3BucketExists = async (AWS, bucket) => {
  const s3 = new AWS.S3();
  try {
    await s3.headBucket({ Bucket: bucket }).promise();
    return true;
  } catch (error) {
    if (error.statusCode === 404) {
      return false;
    }
    throw error;
  }
};

// Cloudformation utils
// ---------------------------------------------------

// Recursively search for cf.js files and compile into one
// template object. Throws error if two attributes are the same.
const compileCloudformationTemplate = async () => {
  const files = await recursiveReadDir(join(process.cwd(), "functions"), [
    "node_modules"
  ]);
  const templates = files
    .filter(f => f.endsWith("/cf.js"))
    .map(f => require(f));

  const template = { Parameters: {}, Resources: {}, Outputs: {} };
  const templateKeys = Object.keys(template);
  templates.forEach(tmpl => {
    templateKeys.forEach(tmplKey => {
      // If the cf.js file has one of the three CF keys
      // Move all the keys inside to the template object.
      if (tmpl.hasOwnProperty(tmplKey)) {
        Object.keys(tmpl[tmplKey]).forEach(key => {
          if (template[tmplKey].hasOwnProperty(key)) {
            console.error(chalk.red(`Identital names found in cf.js: ${key}`));
          } else {
            template[tmplKey][key] = tmpl[tmplKey][key];
          }
        });
      }
    });
  });

  return template;
};

const paramsToInquirer = params => {
  const questions = [];
  Object.keys(params).forEach(key => {
    const obj = params[key];
    questions.push({
      name: key,
      type: obj.AllowedValues ? "list" : "input",
      message: obj.Description || key,
      default: obj.Default,
      choices: obj.AllowedValues
    });
  });
  return questions;
};

module.exports = {
  checkS3BucketExists,
  awsRegions,
  loadConfig,
  saveConfig,
  getAWSWithProfile,
  compileCloudformationTemplate,
  getFunctions,
  buildFunctions,
  zipWebpackOutput,
  uploadZip,
  uploadZips,
  paramsToInquirer
};
