import sade from 'sade';
import { version } from '../package.json';
import {
  getEnvironment,
  loadConfigOrPanic,
  hasConfig,
} from './config/index.js';

import deploy from './commands/deploy.js';
import show from './commands/show.js';
import destroy from './commands/destroy.js';
import eject from './commands/eject.js';
import init from './commands/init.js';

const prog = sade('deploy').version(version);

// Main entry point for the CLI
export function cli(args) {
  prog
    // Deploy command (default command)
    .command('deploy', '', { default: true })
    .describe('Deploy your app to the cloud')
    .option(
      '--env',
      'The environment to deploy to (defaults to current branch)',
    )
    .option(
      '-u, --update-parameters',
      'Update the parameters of the stack',
      false,
    )
    .action(async (opts) => {
      const config = loadConfigOrPanic();
      const env = getEnvironment(opts);

      await deploy({ config, env, options: opts });
    });

  // Show command
  prog
    .command('show')
    .describe('Show information about an AWS stack')
    .option('--env', 'Environment of the stack (defaults to current branch)')
    .action(async (opts) => {
      const config = loadConfigOrPanic();
      const env = getEnvironment(opts);
      await show({ config, env });
    });

  // Destroy command
  prog
    .command('destroy')
    .describe('Removes the entire stack from AWS')
    .option('--env', 'Environment of the stack (defaults to current branch)')
    .action(async (opts) => {
      const config = loadConfigOrPanic();
      const env = getEnvironment(opts);
      await destroy({ config, env });
    });

  // Eject command
  prog
    .command('eject')
    .describe('Eject parts of the default config to overwrite it')
    .action(async () => {
      const config = loadConfigOrPanic();

      await eject({ config });
    });

  // Init command
  prog
    .command('init')
    .describe('Set up deploy for the current directory')
    .option('--env', 'Environment to use (defaults to current branch)')
    .action(async (opts) => {
      let config = null;
      if (hasConfig()) {
        config = loadConfigOrPanic();
      }

      const env = getEnvironment(opts);

      await init({ config, env });
    });

  prog.parse(args);
}
