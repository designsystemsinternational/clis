const fs = require("fs-extra");
const path = require("path");
const ejs = require("ejs");

const readTemplateFile = (folder, filename) => {
  return fs.readFileSync(path.join(__dirname, folder, filename));
};

const requireTemplateFile = (folder, filename) => {
  return require(path.join(".", folder, filename));
};

const renderTemplateFile = (folder, filename, data) => {
  const contents = readTemplateFile(folder, filename);
  return ejs.render(contents.toString(), data);
};

const mergeCfs = (a, b) => {
  const c = { Parameters: {}, Resources: {}, Outputs: {} };
  Object.assign(c.Parameters, a.Parameters, b.Parameters);
  Object.assign(c.Resources, a.Resources, b.Resources);
  Object.assign(c.Outputs, a.Outputs, b.Outputs);
  return c;
};

module.exports = {
  readTemplateFile,
  requireTemplateFile,
  renderTemplateFile,
  mergeCfs
};
