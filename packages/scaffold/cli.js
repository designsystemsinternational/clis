#!/usr/bin/env node

const inquirer = require("inquirer");
const chalk = require("chalk");
const slugify = require("slugify");
const readDir = require("recursive-readdir");
const fs = require("fs-extra");
const path = require("path");
const ora = require("ora");
const shell = require("shelljs");

const templateDir = path.join(__dirname, "template");

const execute = (cmd, cwd, silent = true) => {
  return new Promise(resolve => {
    shell.exec(cmd, { cwd, silent }, resolve);
  });
};

const prompt = async () => {
  const blue = chalk.bgHex("#0000AF").white;
  const red = chalk.bgHex("#D70000").white;
  const white = chalk.bgWhite.hex("#121212");
  console.log(blue("IONAL") + red("DESIGN") + white("SY"));
  console.log(white("STEMS") + blue("INTERNAT"));

  const questions = [
    {
      type: "input",
      name: "name",
      message: "What is the project name?",
      default: "My Project"
    },
    {
      type: "input",
      name: "slug",
      message: "What is the project slug?",
      default: a => slugify(a.name.toLowerCase())
    },
    {
      type: "input",
      name: "namespace",
      message: "What is the namespace?",
      default: "@designsystemsinternational"
    },
    {
      type: "confirm",
      name: "includeTests",
      message: "Would you like to include tests?",
      default: true
    }
  ];
  const answers = await inquirer.prompt(questions);

  // Move static template files
  // ----------------------------------------------

  const spinner = ora("Creating files").start();
  const ignore = ["package.json", "index.html", "node_modules", "dist"];

  // Remove all files in test folder if needed
  if (!answers.includeTests) {
    const ignoreTest = (file, stats) => {
      const relative = path.relative(templateDir, file);
      return relative.substring(0, 4) === "test";
    };
    ignore.push(ignoreTest);
  }

  const templateFiles = await readDir(templateDir, ignore);
  for (const oldPath of templateFiles) {
    const relative = path.relative(templateDir, oldPath);
    const newPath = path.join(answers.slug, relative);
    await fs.copy(oldPath, newPath);
  }

  // package.json
  // ----------------------------------------------

  const packageJson = require(path.join(templateDir, "package.json"));
  packageJson.name = answers.slug;

  // Remove test dependencies
  if (!answers.includeTests) {
    delete packageJson.jest;
    delete packageJson.scripts.test;
    const devDependencies = [
      "babel-jest",
      "enzyme",
      "enzyme-adapter-react-16",
      "jest",
      "jest-environment-enzyme",
      "jest-enzyme"
    ];
    devDependencies.forEach(dep => {
      delete packageJson.devDependencies[dep];
    });
  }

  await fs.outputFile(
    path.join(answers.slug, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );

  // Project Name
  // ----------------------------------------------

  const app = fs
    .readFileSync(path.join(templateDir, "src", "App.js"), "utf8")
    .replace("__My Project__", answers.name);
  await fs.outputFile(path.join(answers.slug, "src", "App.js"), app);

  const readme = fs
    .readFileSync(path.join(templateDir, "README.md"))
    .toString()
    .replace("{{ MyProject }}", answers.name);
  await fs.outputFile(path.join(answers.slug, "README.md"), readme);

  spinner.succeed();

  // npm install
  // ----------------------------------------------

  spinner.start("Installing npm packages");
  await execute("npm install", answers.slug);
  spinner.succeed();

  // Done!
  // ----------------------------------------------

  console.log("");
  console.log(blue("Success!"));
  console.log("");
  console.log("  The following commands are available:");
  console.log("");
  console.log(`  ${white("npm run dev")}         Starts a development server`);
  console.log(`  ${white("npm run build")}       Builds a production bundle`);
  console.log(`  ${white("npm run test")}        Runs project tests`);
  console.log("");

  console.log("   Now run " + white(`cd ${answers.slug}`) + " to get started");
};

prompt();
