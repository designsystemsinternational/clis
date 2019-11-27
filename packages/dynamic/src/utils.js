const md5File = require("md5-file/promise");
const { join, basename } = require("path");
const {
  accessSync,
  readFileSync,
  writeFileSync,
  createReadStream
} = require("fs");
const recursiveReadDir = require("recursive-readdir");
const webpack = require("webpack");
const defaultConfig = require("./default.webpack.config");

// Config file utils
// ---------------------------------------------------

const loadConfig = () => {
  const pack = JSON.parse(readFileSync("./package.json"));
  return { name: pack.name, conf: pack.dynamic };
};

const saveConfig = conf => {
  const pack = JSON.parse(readFileSync("./package.json"));
  pack.dynamic = conf;
  writeFileSync("./package.json", JSON.stringify(pack, null, 2));
};

// AWS utils
// ---------------------------------------------------

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

// Returns an array with info about each lambda function
// const getLambdasInfo = () => {
//   const folders = getDirectories(path.join(__dirname, "..", "src/lambdas/"));
//   return folders.map(folder => {
//     const name = path.basename(folder);
//     return {
//       name,
//       buildPath: path.join("build", name),
//       pascal: humps.pascalize(name)
//     };
//   });
// };
//
// const buildLambdas = async () =>
//   new Promise((resolve, reject) => {
//     console.log("-> Building lambdas with Webpack");
//     webpack(webpackConfig(), (err, stats) => {
//       if (err || stats.hasErrors()) {
//         console.error("Webpack build had errors:", stats.toJson("minimal"));
//         reject(err || stats.hasErrors());
//       } else {
//         resolve();
//       }
//     });
//   });
//
// const zipLampda = async folder => {
//   const zipName = path.basename(folder) + ".zip";
//   const { stdout, stderr } = await exec(
//     `cd ${folder} && zip -r ../${zipName} *`
//   );
//   if (stderr) {
//     throw new Error("Error zipping lambda function: " + stderr);
//   }
//   return folder + ".zip";
// };
//
// const zipLambdas = async folders => {
//   console.log("-> Zipping lambdas");
//   const promises = folders.map(folder => zipLampda(folder));
//   const res = await Promise.all(promises);
//   return res;
// };
//
// const uploadLambda = async (AWS, environment, from) => {
//   const s3 = new AWS.S3();
//   const fingerprint = await md5File.sync(from);
//   const to = `lambdas/${environment}/${fingerprint}.zip`;
//
//   console.log(`Uploading lambda: ${from} --> ${to}`);
//   const stream = fs.createReadStream(from);
//   await s3
//     .upload({ Bucket: "maletek-operations", Key: to, Body: stream })
//     .promise();
//   return to;
// };
//
// const uploadLambdas = async (AWS, environment, froms) => {
//   console.log("-> Uploading lambdas to S3");
//   const promises = froms.map(from => uploadLambda(AWS, environment, from));
//   const res = await Promise.all(promises);
//   return res;
// };

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

module.exports = {
  checkS3BucketExists,
  awsRegions,
  loadConfig,
  saveConfig,
  compileCloudformationTemplate
};
