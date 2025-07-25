import npath from 'node:path';

import chokidar from 'chokidar';
import gulp from 'gulp'; const { dest, parallel } = gulp;
import type Vinyl from 'vinyl';

import { getConfig } from '../util/config.js';
import FSWatcherToStream from '../util/FSWatcherToStream.js';
import chalk from 'chalk';
import { pipeline } from 'node:stream';
import { log, logMove } from '../util/log.js';

import { pluginsIgnoreFilter } from './ignoreFilter.js';
import { pluginsSendFileToServer } from './sendFileToServer.js';

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
  const fileExcludeExts = ['mo', 'po', 'json'];
  const watcher = chokidar.watch('.', {
    cwd: 'src/plugins',
    ignoreInitial: true,
    ignorePermissionErrors: true,
    ignored: pluginsIgnoreFilter({ base: 'src/plugins', fileExcludeExts }),
  });
  watcher.on('change', file => {console.log('change', file);});
  return pipeline(
    FSWatcherToStream(watcher),
    pluginsSendFileToServer(),
    log('watch'),
    error => { if (error) console.error('plugin/watchFiles@watchProjectFiles', 'pipeline error', error); }
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
    .on('addDir', dirname => { if (dirname) watcher.add(compiledFilesOf(dirname)); })
    .on('unlinkDir', dirname => { if (dirname) watcher.unwatch(compiledFilesOf(dirname)); })
  ;

  return pipeline(
    FSWatcherToStream(watcher, {base: `${getConfig().server.root}/wp-content/`}),
    log((data: Vinyl & {event: string}) => `${data.event} online ${chalk.magenta(data.relative)}`),
    dest('.', { cwd: 'src' }),
    error => { if (error) console.error(error); }
  );

  function compiledFilesOf (pluginDirName: string): string {
    const pluginName = npath.basename(pluginDirName);
    const files = `${pluginName}/languages`;
    return files;
  }
}
