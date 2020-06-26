const { join, basename } = require("path");
const {
  readFileSync,
  writeFileSync,
  createReadStream,
  createWriteStream
} = require("fs");
const archiver = require("archiver");
const gitBranch = require("git-branch");
const AWS = require("aws-sdk");

// Config file
// ---------------------------------------------------

const loadConfig = cli => {
  try {
    const packageJson = JSON.parse(readFileSync("./package.json"));
    const conf = packageJson[cli];
    return { conf, packageJson };
  } catch (e) {
    throw `The repo must have a package.json file to use with ${cli}`;
  }
};

const saveConfig = (cli, conf) => {
  const packageJson = JSON.parse(readFileSync("./package.json"));
  const newPackageJson = Object.assign(packageJson, { [cli]: conf });
  writeFileSync("./package.json", JSON.stringify(newPackageJson, null, 2));
};

const getEnvironment = async () => {
  const branch = await gitBranch();
  return branch === "master" ? "production" : branch;
};

const getEnvironmentConfig = (conf, env) => {
  if (!conf || !conf.environments || !conf.environments[env]) {
    return null;
  }
  return conf.environments[env];
};

const saveEnvironmentConfig = (cli, env, envConf) => {
  const { conf } = loadConfig(cli);
  if (!conf.environments) {
    conf.environments = {};
  }
  conf.environments[env] = envConf;
  saveConfig(cli, conf);
};

const deleteEnvironmentConfig = (cli, env) => {
  const { conf } = loadConfig(cli);
  delete conf.environments[env];
  saveConfig(cli, conf);
};

// General AWS
// ---------------------------------------------------

const getAWSWithProfile = (profile, region) => {
  const opts = { region };
  if (profile) {
    opts.credentials = new AWS.SharedIniFileCredentials({ profile });
  }
  AWS.config.update(opts);
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

// Takes the stats object from a webpack build and zips the assets.
// Returns object with { chunkName: { orgFile: PATH, zipFile: PATH }}
const zipWebpackOutput = async stats => {
  const { assetsByChunkName, outputPath } = stats;
  const functionsInfo = {};
  Object.keys(assetsByChunkName).forEach(key => {
    functionsInfo[key] = {
      orgFile: join(outputPath, assetsByChunkName[key]),
      zipFile: join(outputPath, key + ".zip")
    };
  });
  const promises = Object.keys(functionsInfo).map(key =>
    zipFile(functionsInfo[key].orgFile, functionsInfo[key].zipFile)
  );
  await Promise.all(promises);
  return functionsInfo;
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

const uploadFileToS3 = async (AWS, bucket, localFile, s3Key) => {
  const s3 = new AWS.S3();
  const stream = createReadStream(localFile);
  await s3.upload({ Bucket: bucket, Key: s3Key, Body: stream }).promise();
};

// Receives an object with { localFile: s3Key } and uploads all files
const uploadFilesToS3 = async (AWS, bucket, files) => {
  const promises = Object.keys(files).map(key =>
    uploadFileToS3(AWS, bucket, key, files[key])
  );
  await Promise.all(promises);
};

// Cloudformation utils
// ---------------------------------------------------

const paramsToInquirer = (params, opts = {}) => {
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
              `An error occurred: ${stackLatestError.LogicalResourceId} - ${stackLatestError.ResourceStatusReason}.`
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
    throw `Changeset.${attr} resulted in ${data[attr]}`;
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
``;

module.exports = {
  loadConfig,
  saveConfig,
  getEnvironment,
  saveEnvironmentConfig,
  getEnvironmentConfig,
  deleteEnvironmentConfig,
  checkS3BucketExists,
  awsRegions,
  getAWSWithProfile,
  zipWebpackOutput,
  uploadFileToS3,
  uploadFilesToS3,
  monitorStack,
  paramsToInquirer,
  newChangesetName,
  waitForChangeset
};