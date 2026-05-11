#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { THEMES } from '../designs/themes.js';
import { execSync } from 'child_process';

const program = new Command();

program
  .name('usi-maps')
  .description('CLI for Mapbox Static Map generation and styling')
  .version('1.0.0');

program
  .command('server:start')
  .description('Start the REST API server')
  .option('-p, --port <number>', 'Port to listen on', '3000')
  .action((options) => {
    console.log(chalk.blue('Starting usi-maps server...'));
    process.env.PORT = options.port;
    // Use ts-node to run the server in development
    import('../server/index.js');
  });

program
  .command('design:list')
  .description('List available premium designs')
  .action(() => {
    console.log(chalk.bold('\nAvailable Premium Designs:'));
    console.log('----------------------------');
    Object.values(THEMES).forEach(theme => {
      console.log(`${chalk.green(theme.name)} (${chalk.yellow(theme.id)})`);
      console.log(`  ${theme.description}`);
      console.log(`  Style: ${theme.mapboxStyle}\n`);
    });
  });

program.parse(process.argv);
