const AWS = require("aws-sdk");

const mockAWS = (returnValues = {}) => {
  const mockCloudformation = getMockCloudformation();
  AWS.CloudFormation = function() {
    return mockCloudformation;
  };

  return {
    mockCloudformation
  };
};

const getMockCloudformation = () => ({
  createStack: stubAwsMethod({}),
  waitFor: stubAwsMethod({})
});

const getMockSES = () => ({
  sendEmail: stubAwsMethod({
    MessageId: "9655abe4-6ed6-5734-89f7-e6a6a42de02a"
  })
});

const getMockSQS = () => ({
  sendMessage: stubAwsMethod({
    MessageId: "9655abe4-6ed6-5734-89f7-e6a6a42de02a"
  })
});

const getMockDocumentClient = (returnValues = {}) => ({
  put: stubAwsMethod({}),
  get: stubAwsMethod(returnValues.query || { Item: null }),
  query: stubAwsMethod(returnValues.query || {})
});

const getMockIot = () => ({
  attachThingPrincipal: stubAwsMethod({}),
  attachPolicy: stubAwsMethod({}),
  createKeysAndCertificate: stubAwsMethod({
    certificateArn: "arn:aws:iot:us-east-1:123:cert/abc123",
    certificatePem: "fakepem",
    keyPair: {
      PublicKey: "fakepublickey",
      PrivateKey: "fakeprivatekey"
    }
  }),
  createThing: stubAwsMethod({
    thingName: "stubThingName"
  })
});

const getMockIotData = () => ({
  publish: stubAwsMethod()
});

// Quick way to get an object that returns a .promise() with a return/reject
const stubAwsMethod = (resolveValue, rejectValue) => {
  const func = jest.fn();
  func.mockImplementation(() => ({
    promise: () =>
      new Promise((resolve, reject) => {
        if (rejectValue) {
          reject(rejectValue);
        } else {
          resolve(resolveValue);
        }
      })
  }));
  return func;
};

module.exports = {
  mockAWS
};
