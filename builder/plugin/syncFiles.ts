import path from 'path';

import chalk from 'chalk';
import fs from 'fs-extra';
import gulp from 'gulp'; const { dest, series, src, parallel } = gulp;
import watch from 'gulp-watch';
import Vinyl from 'vinyl';
import { vinylFile } from 'vinyl-file';
import chokidar from 'chokidar';

import { getConfig } from '../util/config.js';
import { filter } from '../util/filter.js';
import { info, log } from '../util/log.js';
import { unlinkDest } from '../util/unlinkDest.js';

import { pluginGetTitle } from './getTitle.js';
import { pluginGetVersion } from './getVersion.js';
import { pluginProcessCode } from './processCode.js';
import { pluginProcessDoc } from './processDoc.js';
import { pluginPublishVersion } from './publishVersion.js';
import { Readable } from 'stream';

/** Synchronize plugin files with the server */
export const pluginsSyncFiles = series(
  pluginCopyOnlineCompiledFiles,
  parallel(
    pluginWatchFiles,
    pluginWatchSimpleFiles,
    pluginCopyVendorFiles,
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
    .pipe(unlinkDest('.', { cwd: `${getConfig().server.root}/wp-content` }))
    .pipe(dest('.', { cwd: `${getConfig().server.root}/wp-content` }))
    .pipe(log('copy'));
}

/**
 * List composer dependencies files - exclude dev deps - and copy them on the server
 */
function pluginCopyVendorFiles (cb) {
  /**
   * Fichiers de dépendances à n'envoyer qu'une fois
   *
   * ils sont ignorés du git, aucune modification ne devrait être faite dessus
   * ici, on ne répercute pas de changements
   */
  src(
    ['./*/vendor/**'],
    { base: 'src', cwd: 'src/plugins/' }
  )
    .pipe(filterDevDeps())
    .pipe(dest('.', { cwd: `${getConfig().server.root}/wp-content` }))
    .pipe(log('vendor'));
}

function filterDevDeps () {
  const composerFiles: Record<string, Record<string, any>> = {};

  return filter(async data => {
    if (data.isDirectory()) return false;

    const pluginName = data.relative.split(path.sep)[1];
    const deps = await getDeps(pluginName);
    const from = `plugins/${pluginName}/vendor`;
    const to = path.dirname(data.relative);
    const packageName = path.relative(from, to).replace(/\\/gu, '/');
    if (!packageName && deps.length) return true;

    return deps.some(dep => dep.startsWith(packageName) || packageName.startsWith(dep));
  }, { restore: false });

  async function getDeps (pluginName) {
    if (!composerFiles[pluginName]) {
      const composerFile = path.resolve('src/plugins', pluginName, 'composer.lock');
      if (await fs.exists(composerFile)) {
        const json = await fs.readJson(composerFile);
        composerFiles[pluginName] = json.packages.map(pkg => pkg.name);
      } else {
        composerFiles[pluginName] = [];
      }
    }
    return composerFiles[pluginName];
  }
}

function pluginWatchFiles () {
  const watchers: { add: (name: string) => void; unwatch: (name: string) => void; }[] = [
    pluginWatchOnlineCompiledFiles(),
    pluginWatchCompiledFiles(),
    pluginWatchVersion(),
  ];

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
  const fileTypes = ['css', 'js', 'php', 'pot', 'svg', 'ttf', 'woff2', 'png'];
  const stream = new Readable({ objectMode: true, read () {} });
  chokidar.watch('.', {
    cwd: 'src/plugins/',
    ignoreInitial: false,
    ignorePermissionErrors: true,
    ignored (file, stats) {
      if (/^src\/plugins\/([^\/]*)\/\1.php$/u.test(file)) return true;
      if (/^src\/plugins\/[^\/]*\/(?:vendor|node_modules|tests?|coverage)\//u.test(file)) return true;
      return Boolean(stats?.isFile()) && !fileTypes.some(type => file.endsWith(`.${type}`));
    },
  })
    .on('all', async (event, path, stats) => {
      if (stats?.isFile()) {
        stream.push(Object.assign(await vinylFile(path, { cwd: 'src/plugins' }), {event}));
      }
    })
    .on('ready', ready)

  return stream
    .pipe(log('simple'))
    .pipe(unlinkDest('.', { cwd: `${getConfig().server.root}/wp-content` }))
    .pipe(dest('.', { cwd: `${getConfig().server.root}/wp-content` }));
}

/** Watch for online compiled files and copy them here */
function pluginWatchOnlineCompiledFiles () {
  const watcher = watch([], {
    base: `${getConfig().server.root}/wp-content`,
    cwd: `${getConfig().server.root}/wp-content/plugins/`,
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
    .pipe(unlinkDest('.', { cwd: `${getConfig().server.root}/wp-content` }))
    .pipe(dest('.', { cwd: `${getConfig().server.root}/wp-content` }))
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
