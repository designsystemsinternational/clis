const desc = {
  init: "Initialize the project",
  create: "Create a deployment distribution with CloudFormation",
  deploy: "Deploy the project",
  destroy: "Destroy the deployment distribution"
};

const format = c => `$ static ${c}      `.slice(0, 17);

const man = commands => {
  return `
${Object.keys(commands)
    .map(c => `${format(c)}: ${desc[c]}`)
    .join("\n")}
`;
};

module.exports = { man };
