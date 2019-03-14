const fs = require("fs");
const util = require("util");

const configPath = "./static.json";

const hasConfig = () => {
  try {
    const res = fs.accessSync(configPath);
    return true;
  } catch (e) {
    return false;
  }
};

const loadConfig = () => {
  return JSON.parse(fs.readFileSync(configPath));
};

const saveConfig = conf => {
  fs.writeFileSync(configPath, JSON.stringify(conf, null, 2));
};

const hasEnv = (conf, env) => {
  return conf.environments && conf.environments.hasOwnProperty(env);
};

const saveEnv = (env, vars) => {
  const conf = loadConfig();
  conf.environments = conf.environments || {};
  conf.environments[env] = vars;
  saveConfig(conf);
};

const deleteEnv = env => {
  const conf = loadConfig();
  delete conf.environments[env];
  saveConfig(conf);
};

const desc = {
  init: "Initialize the project",
  create: "Create a deployment distribution with CloudFormation",
  deploy: "Deploy the project",
  destroy: "Destroy the deployment distribution"
};

const format = c => `$ static ${c}      `.slice(0, 17);
const man = commands => {
  return `
${Object.keys(commands)
    .map(c => `${format(c)}: ${desc[c]}`)
    .join("\n")}
`;
};

// Monitors stack create/update/delete
const monitorStack = async (AWS, stackId) => {
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

  console.log(`Checking stack status...`);

  return new Promise((resolve, reject) => {
    const checkStatus = () => {
      cloudformation
        .describeStackEvents({ StackName: stackId })
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
              console.log(
                `CloudFormation - ${eventStatus} - ${event.ResourceType} - ${
                  event.LogicalResourceId
                }`
              );

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
            console.log("Finished");
            return resolve();
          }
        })
        .catch(e => {
          if (e.message.endsWith("does not exist")) {
            console.log(`Stack deletion finished...`);
            resolve();
          } else {
            reject(e.message);
          }
        });
    };

    checkStatus();
  });
};

module.exports = {
  configPath,
  hasConfig,
  loadConfig,
  saveConfig,
  hasEnv,
  saveEnv,
  deleteEnv,
  man,
  monitorStack
};
