const Table = require("cli-table3");

const help = async commands => {
  const table = new Table({
    head: ["Command", "Description"]
  });

  Object.keys(commands).forEach(comm =>
    table.push([comm, commands[comm].description])
  );
  table.push(["help", "Displays this message"]);

  console.log(table.toString());
};

help.description = "Displays this message.";
module.exports = help;
