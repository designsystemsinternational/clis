import inquirer from 'inquirer';

export const confirmOrExit = async (msg, defaultValue = false) => {
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: msg,
      default: defaultValue,
    },
  ]);

  if (!answers.confirm) process.exit();
};
