// This route uses the AWS API Gateway 2.0 payload
// Read more here: https://go.aws/35ktgJ1
const handler = async event => {
  return {
    message: "Hello world!"
  };
};

module.exports = {
  handler
};
