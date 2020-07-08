const expectSaveConfig = (utils, cli, conf) => {
  const { calls } = utils.saveConfig.mock;
  expect(calls.length).toBe(1);
  expect(calls[0][0]).toEqual(cli);
  expect(calls[0][1]).toEqual(conf);
};

const expectSaveEnvironmentConfig = (utils, cli, env, conf) => {
  const { calls } = utils.saveEnvironmentConfig.mock;
  expect(calls.length).toBe(1);
  expect(calls[0][0]).toEqual(cli);
  expect(calls[0][1]).toEqual(env);
  expect(calls[0][2]).toEqual(conf);
};

const expectDeleteEnvironmentConfig = (utils, cli, env) => {
  const saveCalls = utils.deleteEnvironmentConfig.mock.calls;
  expect(saveCalls.length).toBe(1);
  expect(saveCalls[0]).toEqual([cli, env]);
};

const expectEmptyS3Bucket = (utils, bucket) => {
  const saveCalls = utils.emptyS3Bucket.mock.calls;
  expect(saveCalls.length).toBe(1);
  expect(saveCalls[0][1]).toEqual(bucket);
};

const expectCreateStack = (aws, stackName) => {
  const { calls } = aws.mockCloudformation.createStack.mock;
  expect(calls.length).toBe(1);
  expect(calls[0][0].StackName).toEqual(stackName);
  const tmpl = JSON.parse(calls[0][0].TemplateBody);
  return [calls[0], tmpl];
};

const expectUpdateStack = (aws, stackName) => {
  const { calls } = aws.mockCloudformation.updateStack.mock;
  expect(calls.length).toBe(1);
  expect(calls[0][0].StackName).toEqual(stackName);
  const tmpl = JSON.parse(calls[0][0].TemplateBody);
  return [calls[0], tmpl];
};

const expectDeleteStack = (aws, stackName) => {
  const { calls } = aws.mockCloudformation.deleteStack.mock;
  expect(calls.length).toBe(1);
  expect(calls[0][0].StackName).toEqual(stackName);
  return calls[0];
};

const expectParameters = (actual, desired) => {
  const desiredObj = Object.keys(desired).map(key => ({
    ParameterKey: key,
    ParameterValue: desired[key]
  }));
  expect(actual).toEqual(desiredObj);
};

module.exports = {
  expectSaveConfig,
  expectSaveEnvironmentConfig,
  expectDeleteEnvironmentConfig,
  expectEmptyS3Bucket,
  expectCreateStack,
  expectUpdateStack,
  expectDeleteStack,
  expectParameters
};
