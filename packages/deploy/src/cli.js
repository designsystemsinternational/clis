import sade from 'sade';
import { version } from '../package.json';
import { getEnvironment, loadConfigOrPanic } from './config/index.js';

import deploy from './commands/deploy.js';
import show from './commands/show.js';
import destroy from './commands/destroy.js';

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

  prog.parse(args);
}
