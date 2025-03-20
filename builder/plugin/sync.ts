import chalk from 'chalk';
import gulp from 'gulp'; const { series } = gulp;

import { info } from '../util/log.js';
import { pluginsCleanServerFiles } from './cleanServerFiles.js';
import { pluginCopyFiles } from './copyFiles.js';
import { pluginWatchFiles } from './watchFiles.js';

/** Synchronize plugin files with the server */
export function pluginsSync (cb) {
  return series(
    pluginsCleanServerFiles,
    pluginCopyFiles,
    logReady,
    pluginWatchFiles,
  )(cb);
}

/**
 * Display "READY" message when all the files are uploaded to the server
 */
function logReady (cb) {
  info(chalk.red(`READY: The ${chalk.yellow('plugins')} files are all uploaded`));
}
