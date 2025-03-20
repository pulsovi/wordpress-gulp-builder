import npath from 'node:path';

import chokidar, { FSWatcher } from 'chokidar';
import { dest, parallel } from 'gulp';
import type Vinyl from 'vinyl';

import { getConfig } from '../util/config';
import FSWatcherToStream from '../util/FSWatcherToStream';
import chalk from 'chalk';
import { pipeline } from 'node:stream';
import { log, logMove } from '../util';

import { pluginsIgnoreFilter } from './ignoreFilter';
import { pluginsSendFileToServer } from './sendFileToServer';

/**
 * Gulp task: watch files for keeping synchronization
 */
export function pluginWatchFiles (cb) {
  parallel(
    watchProjectFiles,
    watchServerFiles,
  )(cb);
}

function watchProjectFiles () {
  const watcher = chokidar.watch('./plugins', {
    cwd: 'src',
    ignoreInitial: true,
    ignorePermissionErrors: true,
    ignored: pluginsIgnoreFilter
  });
  return pipeline(
    FSWatcherToStream(watcher),
    log('watch'),
    pluginsSendFileToServer(),
    logMove('watch')
  );
}

/** Watch for online compiled files and copy them here when change */
function watchServerFiles () {
  const includeExts = ['mo', 'po', 'json'];

  const watcher = chokidar.watch([], {
    cwd: `${getConfig().server.root}/wp-content/plugins`,
    ignoreInitial: true,
    ignorePermissionErrors: true,
    ignored (path, stats) {
      return Boolean(stats?.isFile()) && !includeExts.some(ext => path.endsWith(`.${ext}`));
    },
  });

  chokidar.watch('.', {
    cwd: 'src/plugins/',
    depth: 0,
    ignoreInitial: false,
    ignorePermissionErrors: true,
  })
    .on('addDir', dirname => watcher.add(compiledFilesOf(dirname)))
    .on('unlinkDir', dirname => watcher.unwatch(compiledFilesOf(dirname)))
  ;

  return pipeline(
    FSWatcherToStream(watcher, {base: `${getConfig().server.root}/wp-content/`}),
    log((data: Vinyl & {event: string}) => `${data.event} online ${chalk.magenta(data.relative)}`),
    dest('.', { cwd: 'src' }),
  );

  function compiledFilesOf (pluginDirName: string): string {
    const pluginName = npath.basename(pluginDirName);
    const files = `${pluginName}/languages`;
    console.log('compiledFilesOf', {pluginDirName, pluginName, files});
    return files;
  }
}
