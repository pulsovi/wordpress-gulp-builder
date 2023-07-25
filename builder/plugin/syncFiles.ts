import path from 'path';

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

import { pluginGetTitle } from './getTitle';
import { pluginGetVersion } from './getVersion';
import { pluginProcessCode } from './processCode';
import { pluginProcessDoc } from './processDoc';
import { pluginPublishVersion } from './publishVersion';

/** Synchronize plugin files with the server */
export const pluginsSyncFiles = series(
  pluginCopyOnlineCompiledFiles,
  parallel(
    pluginWatchFiles,
    pluginWatchSimpleFiles,
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
  return src(
    ['./*/languages/*.po', '*/languages/*.mo', '*/languages/*.json'],
    { base: 'src', cwd: 'src/plugins/' }
  )
    .pipe(unlinkDest('.', { cwd: `${config.server.root}/wp-content` }))
    .pipe(dest('.', { cwd: `${config.server.root}/wp-content` }))
    .pipe(log('copy'));
}

function pluginWatchFiles () {
  const watchers: { add: (name: string) => void; unwatch: (name: string) => void }[] = [
    pluginWatchOnlineCompiledFiles(),
    pluginWatchCompiledFiles(),
    pluginWatchVersion(),
  ]

  watch('src/plugins/*/', {
    depth: 1,
    events: ['addDir', 'unlinkDir'],
    ignoreInitial: false,
    ignorePermissionErrors: true,
    read: false,
    verbose: true,
  })
    .on('unlinkDir', dirname => { all('unwatch', path.basename(dirname)); })
    .on('addDir', dirname => { all('add', path.basename(dirname)); })
  ;

  function all (method: 'add' | 'unwatch', pluginName: string) {
    watchers.forEach(watcher => {
      watcher[method](pluginName);
    });
  }
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
function pluginWatchOnlineCompiledFiles () {
  const watcher = watch([], {
    base: `${config.server.root}/wp-content`,
    cwd: `${config.server.root}/wp-content/plugins/`,
    ignoreInitial: true,
    ignorePermissionErrors: true,
  });

  watcher
    .pipe(log((data: Vinyl) => `${data.event} online ${chalk.magenta(data.relative)}`))
    .pipe(dest('.', { cwd: 'src' }))
  ;

  return {
    add (pluginName: string) { watcher.add(compiledFilesOf(pluginName)); },
    unwatch (pluginName: string) { watcher.unwatch(compiledFilesOf(pluginName)); },
  };

  function compiledFilesOf (pluginDirName: string): string[] {
    const pluginName = path.basename(pluginDirName);
    return ['mo', 'po', 'json'].map(ext => `${pluginName}/languages/*.${ext}`);
  }
}

/** Watch for compiled files, compile and copy them to the server */
function pluginWatchCompiledFiles () {
  const watcher = watch('**/*.md', {
    base: 'src',
    cwd: 'src/plugins',
    ignoreInitial: false,
    ignorePermissionErrors: true
  });

  watcher
    .on('ready', ready)
    .pipe(pluginProcessDoc())
    .pipe(pluginProcessCode())
    .pipe(dest('.', { cwd: `${config.server.root}/wp-content` }))
    .pipe(log())
  ;

  return {
    add (pluginName: string) { watcher.add(compiledFilesOf(pluginName)); },
    unwatch (pluginName: string) { watcher.unwatch(compiledFilesOf(pluginName)); },
  };

  function compiledFilesOf (pluginName: string) {
    return [`${pluginName}/${pluginName}.php`];
  }
}

/** Watch for plugin version change and publish them */
function pluginWatchVersion () {
  const watcher = watch([], {
    base: 'src',
    cwd: 'src/plugins',
    ignoreInitial: false,
    ignorePermissionErrors: true
  }, (file: Vinyl) => {
    const code = file._contents.toString();
    const version = pluginGetVersion({ code, isRequired: true });
    const title = pluginGetTitle({ code, isRequired: true });
    pluginPublishVersion({ version, title });
  });

  return {
    add (pluginName: string) { watcher.add(compiledFilesOf(pluginName)); },
    unwatch (pluginName: string) { watcher.unwatch(compiledFilesOf(pluginName)); },
  };

  function compiledFilesOf (pluginName: string) {
    return [`${pluginName}/${pluginName}.php`];
  }
}

/** Display "READY" message when all the files are uploaded to the server */
let ready_count = 2;
function ready () {
  ready_count -= 1;
  if (ready_count < 0) console.error('Too much "ready" events');
  if (ready_count === 0) info(`${chalk.red('READY')} The plugins files are all uploaded`);
}
