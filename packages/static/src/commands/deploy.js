const execa = require("execa");
const ora = require("ora");
const inquirer = require("inquirer");
const chalk = require("chalk");
const path = require("path");

const {
  loadConfig,
  getEnvironment,
  getEnvironmentConfig,
  saveEnvironmentConfig,
  getAWSWithProfile,
  monitorStack,
  uploadDirToS3,
  paramsToInquirer,
  assignTemplate,
  formatAwsName,
  log,
  logTable
} = require("@designsystemsinternational/cli-utils");
const {
  ACTION_NO_CONFIG
} = require("@designsystemsinternational/cli-utils/src/constants");
const s3Template = require("../cloudformation/s3.json");
const cloudfrontTemplate = require("../cloudformation/cloudfront.json");
const authTemplate = require("../cloudformation/auth.json");
const domainTemplate = require("../cloudformation/domain.json");
const { defaultFileParams } = require("../utils");

// Main
// ---------------------------------------------------------------------

const deploy = async (args = {}) => {
  const { conf, packageJson } = loadConfig("static");
  if (!conf) {
    throw ACTION_NO_CONFIG;
  }
  const env = args && args.env ? args.env : await getEnvironment();
  const envConf = getEnvironmentConfig(conf, env);

  if (!envConf || args.configure) {
    const newEnvConf = await runCloudFormation(env, conf, packageJson, envConf);
    await uploadFiles(env, conf, packageJson, newEnvConf, args);
  } else {
    await uploadFiles(env, conf, packageJson, envConf, args);
  }
};

// Create Stack
// ---------------------------------------------------------------------

const runCloudFormation = async (env, conf, packageJson, envConf) => {
  const AWS = getAWSWithProfile(conf.profile, conf.region);
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "stack",
      message: `Name of the new Cloudformation stack`,
      default: formatAwsName(packageJson.name, env),
      when: !envConf || !envConf.stack
    },
    {
      type: "confirm",
      name: "auth",
      message:
        "Enable basic authentication? (requires CloudFront distribution)",
      default: false
    },
    {
      type: "confirm",
      name: "domain",
      message:
        "Enable custom domain? (requires CloudFront distribution and hosted zone ID from Route53)",
      default: false
    },
    {
      type: "confirm",
      when: a => !a.auth && !a.domain,
      name: "createCloudfront",
      message: "Do you want to set up a Cloudfront distribution?",
      default: true
    }
  ]);

  const stack = answers.stack || envConf.stack;

  // Combine cloudformation templates if needed
  // We perform a somewhat deep copy to not mess up the tests.
  const template = {};
  assignTemplate(template, s3Template);

  if (answers.createCloudfront || answers.auth || answers.domain) {
    assignTemplate(template, cloudfrontTemplate);
    const {
      DistributionConfig
    } = template.Resources.CloudfrontDistribution.Properties;
    if (answers.auth) {
      assignTemplate(template, authTemplate);
      // We don't have any template logic, so I just inject this here.
      DistributionConfig.DefaultCacheBehavior.LambdaFunctionAssociations = [
        {
          EventType: "viewer-request",
          LambdaFunctionARN: { Ref: "VersionedAuthLambda" }
        }
      ];
    }
    if (answers.domain) {
      assignTemplate(template, domainTemplate);
      DistributionConfig.Aliases = [{ Ref: "Domain" }];
      DistributionConfig.ViewerCertificate = {
        AcmCertificateArn: { Ref: "Certificate" },
        SslSupportMethod: "sni-only"
      };
    }
  }

  // Dynamic default values for the parameter questions.
  const defaults = {
    S3BucketName: envConf ? envConf.bucket : answers.stack
  };

  // Add questions based on Cloudformation parameters
  const templateAnswers = await inquirer.prompt(
    paramsToInquirer(template.Parameters, defaults)
  );

  const label = envConf ? "Updating stack" : "Creating stack";
  const spinner = ora(label).start();
  const parameters = Object.assign({}, defaults, templateAnswers);

  // Automatic parameters
  template.Parameters["environment"] = {
    Description: "Stack environment based on Git branch",
    Type: "String"
  };
  parameters.environment = env;

  const cloudformation = new AWS.CloudFormation();

  let operation;

  if (!envConf) {
    operation = await cloudformation
      .createStack({
        StackName: stack,
        Parameters: Object.keys(parameters).map(key => ({
          ParameterKey: key,
          ParameterValue: parameters[key].toString()
        })),
        TemplateBody: JSON.stringify(template),
        Capabilities: ["CAPABILITY_NAMED_IAM"]
      })
      .promise();

    const created = await cloudformation
      .waitFor("stackCreateComplete", {
        StackName: stack
      })
      .promise();
  } else {
    operation = await cloudformation
      .updateStack({
        StackName: stack,
        Parameters: Object.keys(parameters).map(key => ({
          ParameterKey: key,
          ParameterValue: parameters[key].toString()
        })),
        TemplateBody: JSON.stringify(template),
        Capabilities: ["CAPABILITY_NAMED_IAM"]
      })
      .promise();

    const updated = await cloudformation
      .waitFor("stackUpdateComplete", {
        StackName: stack
      })
      .promise();
  }

  spinner.succeed();

  spinner.start("Saving environment config");
  const newEnvConf = {
    stack,
    bucket: parameters.S3BucketName,
    fileParams: defaultFileParams
  };
  saveEnvironmentConfig("static", env, newEnvConf);
  spinner.succeed();

  // Listen for changes to cloudformation
  await monitorStack(AWS, operation.StackId);

  const stacks = await cloudformation
    .describeStacks({ StackName: stack })
    .promise();

  logTable(
    ["Key", "Value", "Description"],
    stacks.Stacks[0].Outputs.map(o => [
      o.OutputKey,
      o.OutputValue,
      o.Description
    ])
  );

  log(
    `The resources for the new environment have now been set up with this configuration:

${JSON.stringify(newEnvConf, null, 2)}

`
  );

  return newEnvConf;
};

// Upload Files
// ---------------------------------------------------------------------

const uploadFiles = async (env, conf, packageJson, envConf, args) => {
  let answers = { confirm: args.confirm };

  const {
    profile,
    region,
    shouldRunBuildCommand,
    buildCommand,
    buildDir
  } = conf;

  const { bucket, fileParams } = envConf;

  if (!answers.confirm) {
    answers = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: `This will deploy the ${chalk.red(
          env
        )} environment. Continue?`,
        default: formatAwsName(packageJson.name, env)
      }
    ]);
  }

  if (!answers.confirm) return;

  const spinner = ora("Starting deployment").start();

  if (shouldRunBuildCommand) {
    spinner.text = "Running build command";
    await execa.shell(buildCommand, {
      stdout: "inherit"
    });
    spinner.succeed();
  }

  const AWS = getAWSWithProfile(profile, region);

  const onProgress = (cur, total) => {
    if (total > 0) {
      spinner.text = `Uploading assets (${Math.round((cur / total) * 100)}%)`;
    }
  };

  spinner.start("Uploading assets");
  await uploadDirToS3(AWS, buildDir, bucket, fileParams, {
    progress: onProgress,
    fileUploadEnd: file => console.log("uploading", file),
    shouldUpload: file => {
      console.log(file, path.extname(file), path.extname(file) !== ".html");
      return path.extname(file) !== ".html";
    }
  });
  spinner.succeed();

  spinner.start("Uploading HTML files");
  await uploadDirToS3(AWS, buildDir, bucket, fileParams, {
    progress: onProgress,
    fileUploadEnd: file => console.log("uploading", file),
    shouldUpload: file => {
      console.log(file, path.extname(file), path.extname(file) === ".html");
      return path.extname(file) === ".html";
    }
  });
  spinner.succeed();
};

module.exports = deploy;
