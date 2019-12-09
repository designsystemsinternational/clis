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
