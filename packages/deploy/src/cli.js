import sade from 'sade';
import { version } from '../package.json';
import { getEnvironment, loadConfigOrPanic } from './config/index.js';
import deploy from './commands/deploy.js';

const prog = sade('deploy').version(version);

// Main entry point for the CLI
export function cli(args) {
  prog
    .command('deploy')
    .describe('Deploy your app to the cloud')
    .option('--env', 'The environment to deploy to')
    .action(async (opts) => {
      const config = loadConfigOrPanic();
      const env = getEnvironment(opts);

      await deploy(config, env);
    });

  prog.parse(args);
}
