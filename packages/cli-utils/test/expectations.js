const expectSaveEnvironmentConfig = (utils, cli, env, conf) => {
  const { calls } = utils.saveEnvironmentConfig.mock;
  expect(calls.length).toBe(1);
  expect(calls[0][0]).toEqual(cli);
  expect(calls[0][1]).toEqual(env);
  expect(calls[0][2]).toEqual(conf);
};

const expectCreateStack = (aws, stackName, templateBody) => {
  const { calls } = aws.mockCloudformation.createStack.mock;
  expect(calls.length).toBe(1);
  const call = calls[0];
  expect(call[0].StackName).toEqual(stackName);
  const tmpl = JSON.parse(call[0].TemplateBody);
  return [call, tmpl];
};

module.exports = {
  expectSaveEnvironmentConfig,
  expectCreateStack
};
