#!/usr/bin/env node

const inquirer = require("inquirer");
const chalk = require("chalk");
const slugify = require("slugify");
const readDir = require("recursive-readdir");
const fs = require("fs-extra");
const path = require("path");
const ora = require("ora");
const ejs = require("ejs");

const templateDir = path.join(__dirname, "template");

const execute = (cmd, cwd, silent = true) => {
  return new Promise(resolve => {
    shell.exec(cmd, { cwd, silent }, resolve);
  });
};

const createFiles = async answers => {
  const templateFiles = await readDir(templateDir, ["node_modules"]);
  for (const filePath of templateFiles) {
    const filePathRel = path.relative(templateDir, filePath);
    const filePathNew = path.join(answers.slug, filePathRel);
    const data = await new Promise(resolve => {
      ejs.renderFile(filePath, answers, (e, file) => resolve(file));
    });
    await fs.outputFile(filePathNew, data);
  }
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
      message: "What is your project name?",
      default: "My Project"
    },
    {
      type: "input",
      name: "slug",
      message: "What is your project slug?",
      default: a => slugify(a.name.toLowerCase())
    }
  ];
  const answers = await inquirer.prompt(questions);

  // Create template files
  const filesPromise = createFiles(answers);
  ora.promise(filesPromise, { text: "Creating project files" });
  await filesPromise;

  // npm install
  const installPromise = execute("npm install", answers.slug);
  ora.promise(installPromise, { text: "Installing npm packages" });
  await installPromise;

  // Success outro logging
  console.log("");
  console.log(blue("Success!"));
  console.log(
    "  The following commands are available within that directory:\n"
  );
  console.log(`  ${white("npm run dev")}         Starts a development server`);
  console.log(`  ${white("npm run build")}       Builds a production bundle`);
  console.log(`  ${white("npm run test")}        Runs project tests`);
};

prompt();
