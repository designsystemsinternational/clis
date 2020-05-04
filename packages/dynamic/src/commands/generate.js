const inquirer = require("inquirer");
const ora = require("ora");
const path = require("path");
const fs = require("fs-extra");
const {
  readTemplateFile,
  requireTemplateFile,
  renderTemplateFile,
  mergeCfs
} = require("../templates/utils");

// Generate a route
// ------------------------------------------------------

const route = async () => {
  const answers = await inquirer.prompt([
    {
      name: "path",
      type: "input",
      message: `Path to new route file`,
      default: "functions/helloWorld.js"
    },
    {
      name: "method",
      type: "input",
      message: `HTTP method for endpoint`,
      default: "GET"
    },
    {
      name: "route",
      type: "input",
      message: `HTTP route for endpoint`,
      default: "/hello"
    }
  ]);

  // Make sure we route starts with forward slash
  if (!answers.route.startsWith("/")) {
    answers.route = "/" + answers.route;
  }

  answers.name = path.basename(answers.path, ".js");
  const rootDir = path.dirname(answers.path).split(path.sep)[0];

  // render cf.js
  const mainPath = path.join(rootDir, "cf.js");
  if (fs.existsSync(mainPath)) {
    const mainExisting = require(path.join(process.cwd(), mainPath));
    if (!mainExisting.Resources || !mainExisting.Resources.api) {
      const mainTmpl = requireTemplateFile("route", "cf.js");
      const mainUpdated = mergeCfs(mainTmpl, mainExisting);
    }
  } else {
    const tmpl = readTemplateFile("route", "cf.js");
    await fs.outputFile(path.join(rootDir, "cf.js"), tmpl);
  }

  // render route.js to name.js
  const routeFile = renderTemplateFile("route", "route.js", answers);
  await fs.outputFile(answers.path, routeFile);

  // render route.cf.js to name.cf.js
  const cfFile = renderTemplateFile("route", "route.cf.js", answers);
  await fs.outputFile(answers.path.replace(".js", ".cf.js"), cfFile);
};

const map = {
  route
};

const generate = async args => {
  const template = args[3];
  if (map.hasOwnProperty(template)) {
    await map[template](args);
  } else {
    console.error(`Generator not supported: ${template}`);
  }
};

module.exports = generate;
