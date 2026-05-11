#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { THEMES } from '../designs/themes.js';
import { execSync } from 'child_process';
import { MapboxDataService } from '../core/MapboxDataService.js';
import { CsvProcessor } from '../core/CsvProcessor.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

program
  .command('dataset:upload')
  .description('Upload krakow.csv data to Mapbox Datasets')
  .option('-i, --id <string>', 'Dataset ID (e.g. krakow-investments)')
  .action(async (options) => {
    const accessToken = process.env.MAPBOX_ACCESS_TOKEN || '';
    if (!accessToken) {
      console.error(chalk.red('Error: MAPBOX_ACCESS_TOKEN not found in .env'));
      return;
    }

    const datasetId = options.id || 'krakow-investments';
    const csvPath = path.join(__dirname, '../../reference/krakow.csv');
    
    console.log(chalk.blue(`Reading ${csvPath}...`));
    const points = CsvProcessor.parsePoints(csvPath);
    const geoJson = CsvProcessor.toGeoJson(points);

    const dataService = new MapboxDataService(accessToken);
    
    try {
      // First try to upload. If dataset doesn't exist, we might need to create it manually or via another command
      // For now, let's assume the user provides a valid ID or we use a default
      console.log(chalk.yellow(`Starting upload to dataset: ${datasetId}`));
      await dataService.uploadToDataset(datasetId, geoJson);
      console.log(chalk.green('SUCCESS: Data uploaded to Mapbox Datasets.'));
    } catch (err: any) {
      console.error(chalk.red(`Error: ${err.message}`));
    }
  });

program.parse(process.argv);
