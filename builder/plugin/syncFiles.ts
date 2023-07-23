import chalk from 'chalk';
import { dest, series, src, parallel } from 'gulp';
import watch from 'gulp-watch';
import Vinyl from 'vinyl';

import { config } from '../util/config';
import { filter } from '../util/filter';
import { fs } from '../util/fs';
import { info, log, logMove } from '../util/log';
import { pipelinePart } from '../util/pipelinePart';
import { unlinkDest } from '../util/unlinkDest';

import { pluginProcessCode } from './processCode';
import { pluginProcessDoc } from './processDoc';

/** Synchronize plugin files with the server */
export const pluginsSyncFiles = series(
  pluginCopyOnlineCompiledFiles,
  parallel(
    pluginWatchSimpleFiles,
    pluginWatchOnlineCompiledFiles,
    pluginWatchCompiledFiles,
  ),
);

/** List online compiled files and copy them on the server */
function pluginCopyOnlineCompiledFiles () {
  /**
   * Fichiers pré-compilés à n'envoyer qu'une fois
   *
   * ils sont compilés sur le serveur et sont renvoyés ici par `pluginWatchOnlineCompiledFiles`
   * si on les suivait avec watch, on aurait une boucle infinie
   */
  return src(['./**/*.po', '**/*.mo'], { base: 'src', cwd: 'src/plugins/' })
    .pipe(unlinkDest('.', { cwd: `${config.server.root}/wp-content` }))
    .pipe(dest('.', { cwd: `${config.server.root}/wp-content` }))
    .pipe(log());
}

/** Watch for simple files which not need any compilation and copy them to the server */
function pluginWatchSimpleFiles () {
  const fileTypes = ['css', 'js', 'php', 'pot', 'svg'].map(ext => `**/*.${ext}`);
  return watch(
    fileTypes,
    { base: 'src', cwd: 'src/plugins/', ignoreInitial: false, ignorePermissionErrors: true }
  )
    .on('ready', ready)
    .pipe(filter(data => !data.relative.match(/^plugins(?:\/|\\)([^\/\\]*)(?:\/|\\)\1.php$/), { restore: false }))
    .pipe(log())
    .pipe(unlinkDest('.', { cwd: `${config.server.root}/wp-content` }))
    .pipe(dest('.', { cwd: `${config.server.root}/wp-content` }))
}

/** Watch for online compiled files and copy them here */
async function pluginWatchOnlineCompiledFiles (pluginName) {
  const watcher = watch([], {
    base: `${config.server.root}/wp-content`,
    cwd: `${config.server.root}/wp-content/plugins/`,
    ignoreInitial: true,
    ignorePermissionErrors: true,
  });

  watch('src/plugins/*/', {
    depth: 1,
    events: ['addDir', 'unlinkDir'],
    ignoreInitial: false,
    ignorePermissionErrors: true,
    read: false,
    verbose: true,
  })
    .on('unlinkDir', dirname => { watcher.unwatch(compiledFilesOf(dirname)); })
    .on('addDir', dirname => { watcher.add(compiledFilesOf(dirname)); });

  return watcher
    .pipe(dest('.', { cwd: 'src' }))
    .pipe(logMove())
    .pipe(log());
}

  function compiledFilesOf (pluginName: string): string[] {
    return [
      `${pluginName}/**/*.mo`,
      `${pluginName}/**/*.po`,
    ];
  }

/** Watch for compiled files, compile and copy them to the server */
async function pluginWatchCompiledFiles () {
  const plugins = (await fs.readdir('src/plugins', { withFileTypes: true }))
    .filter(dirent => dirent.isDirectory())
    .map(dirent => `${dirent.name}/${dirent.name}.php`);

  return watch(
    [...plugins, '**/*.md'],
    { base: 'src', cwd: 'src/plugins', ignoreInitial: false, ignorePermissionErrors: true }
  )
    .on('ready', ready)
    .pipe(pluginProcessDoc())
    .pipe(pluginProcessCode())
    .pipe(dest('.', { cwd: `${config.server.root}/wp-content` }))
    .pipe(log())
}

/** Display "READY" message when all the files are uploaded to the server */
let ready_count = 2;
function ready () {
  ready_count -= 1;
  if (ready_count < 0) console.error('Too much "ready" events');
  if (ready_count === 0) info(`${chalk.red('READY')} The plugins files are all uploaded`);
}
