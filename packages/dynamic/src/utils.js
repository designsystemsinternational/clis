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
const gitBranch = require("git-branch");
const AWS = require("aws-sdk");

// General
// ---------------------------------------------------

const getEnvironment = async () => {
  const branch = await gitBranch();
  return branch === "master" ? "production" : branch;
};

const getStackName = (name, conf, environment) => {
  if (
    conf &&
    conf.environments &&
    conf.environments[environment] &&
    conf.environments[environment].stackName
  ) {
    return conf.environments[environment].stackName;
  } else {
    return `${name}-${environment}`;
  }
};

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
const getFunctions = async name => {
  const files = await recursiveReadDir(join(process.cwd(), "functions"), [
    "node_modules",
    "cf.js"
  ]);
  const functions = files.map(f => ({
    name: basename(f, ".js"),
    path: f
  }));
  if (name) {
    return functions.filter(f => f.name === name);
  } else {
    return functions;
  }
};

const buildFunctions = async (functions, buildFolder) => {
  const entries = {};
  functions.forEach(f => (entries[f.name] = f.path));
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

const paramsToInquirer = (params, opts) => {
  const questions = [];
  Object.keys(params).forEach(key => {
    const obj = params[key];
    questions.push({
      name: key,
      type: obj.AllowedValues ? "list" : "input",
      message: obj.Description || key,
      default: obj.Default || opts.default,
      choices: obj.AllowedValues
    });
  });
  return questions;
};

// Monitors stack create/update/delete
const monitorStack = async (AWS, stackName, onEvent = () => {}) => {
  const validStatuses = [
    "CREATE_COMPLETE",
    "UPDATE_COMPLETE",
    "DELETE_COMPLETE"
  ];
  const loggedEvents = [];
  let monitoredSince = null;
  let stackStatus = null;
  let stackLatestError = null;

  const cloudformation = new AWS.CloudFormation();

  return new Promise((resolve, reject) => {
    const checkStatus = () => {
      cloudformation
        .describeStackEvents({ StackName: stackName })
        .promise()
        .then(data => {
          const stackEvents = data.StackEvents;

          // Find the first relevant stack event with CREATE, UPDATE or DELETE status
          const firstRelevantEvent = stackEvents.find(event => {
            const isStack = "AWS::CloudFormation::Stack";
            const updateIsInProgress = "UPDATE_IN_PROGRESS";
            const createIsInProgress = "CREATE_IN_PROGRESS";
            const deleteIsInProgress = "DELETE_IN_PROGRESS";
            return (
              event.ResourceType === isStack &&
              (event.ResourceStatus === updateIsInProgress ||
                event.ResourceStatus === createIsInProgress ||
                event.ResourceStatus === deleteIsInProgress)
            );
          });

          // set the date some time before the first found
          // stack event of recently issued stack modification
          if (firstRelevantEvent) {
            const eventDate = new Date(firstRelevantEvent.Timestamp);
            const updatedDate = eventDate.setSeconds(
              eventDate.getSeconds() - 5
            );
            monitoredSince = new Date(updatedDate);
          }

          // Loop through stack events
          stackEvents.reverse().forEach(event => {
            const eventInRange = monitoredSince <= event.Timestamp;
            const eventNotLogged = loggedEvents.indexOf(event.EventId) === -1;
            let eventStatus = event.ResourceStatus || null;
            if (eventInRange && eventNotLogged) {
              // Keep track of stack status
              if (
                event.ResourceType === "AWS::CloudFormation::Stack" &&
                event.StackName === event.LogicalResourceId
              ) {
                stackStatus = eventStatus;
              }

              // Keep track of first failed event
              if (
                eventStatus &&
                (eventStatus.endsWith("FAILED") ||
                  eventStatus === "UPDATE_ROLLBACK_IN_PROGRESS") &&
                stackLatestError === null
              ) {
                stackLatestError = event;
              }

              // Log stack events
              onEvent(eventStatus, event);

              // Prepare for next monitoring action
              loggedEvents.push(event.EventId);
            }
          });

          // Handle stack create/update/delete failures
          if (
            stackLatestError ||
            (stackStatus &&
              (stackStatus.endsWith("ROLLBACK_COMPLETE") ||
                stackStatus === "DELETE_FAILED"))
          ) {
            console.error("Operation failed!");
            return reject(
              `An error occurred: ${stackLatestError.LogicalResourceId} - ${
                stackLatestError.ResourceStatusReason
              }.`
            );
          }

          if (validStatuses.indexOf(stackStatus) === -1) {
            setTimeout(checkStatus, 5000);
          } else {
            return resolve();
          }
        })
        .catch(e => {
          if (e.message.endsWith("does not exist")) {
            // Stack deletion finished
            resolve();
          } else {
            reject(e.message);
          }
        });
    };

    checkStatus();
  });
};

const changesetWorking = [
  "CREATE_PENDING",
  "CREATE_IN_PROGRESS",
  "EXECUTE_IN_PROGRESS"
];

const waitForChangeset = async (
  cloudformation,
  stackName,
  changesetName,
  attr = "Status",
  desired = "CREATE_COMPLETE"
) => {
  const data = await cloudformation
    .describeChangeSet({
      StackName: stackName,
      ChangeSetName: changesetName
    })
    .promise();
  if (data[attr] === desired) {
    return;
  } else if (changesetWorking.includes(data[attr])) {
    await timeout(3000);
    return waitForChangeset(
      cloudformation,
      stackName,
      changesetName,
      attr,
      desired
    );
  } else {
    console.error(chalk.red(`Changeset.${attr} resulted in ${data[attr]}`));
    return;
  }
};

// Others
// ---------------------------------------------------

const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));

const newChangesetName = () => {
  const now = new Date();
  return `deploy-${now.getFullYear()}-${now.getMonth() +
    1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
};

module.exports = {
  getEnvironment,
  getStackName,
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
  monitorStack,
  paramsToInquirer,
  newChangesetName,
  waitForChangeset
};
