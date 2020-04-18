const chalk = require("chalk");
const Table = require("cli-table3");

const help = async commands => {
  const table = new Table({
    head: ["Command", "Description"]
  });

  Object.keys(commands).forEach(comm =>
    table.push([comm, commands[comm].description])
  );

  console.log(`
This is a simple, opinionated command-line client
that takes the pain out of deploying a static website
to S3 and Cloudfront via Cloudformation.

${chalk.bold("Available commands:")}`);

  console.log(table.toString());
};

help.description = "Displays this message.";
module.exports = help;
