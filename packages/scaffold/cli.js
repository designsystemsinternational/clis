#!/usr/bin/env node\

const inquirer = require("inquirer");
const chalk = require("chalk");
const slugify = require("slugify");

const run = async () => {
  const questions = [
    {
      type: "input",
      name: "name",
      message: "Project name"
    }
  ];

  const answers = await inquirer.prompt(questions);

  const slug = slugify(answers.name.toLowerCase());
};
