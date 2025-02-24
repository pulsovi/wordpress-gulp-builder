import path from 'path';

import chalk from 'chalk';
import fs from 'fs-extra';
import gulp from 'gulp'; const { dest, series, src, parallel } = gulp;
import Vinyl from 'vinyl';
import { vinylFile } from 'vinyl-file';
import chokidar from 'chokidar';

import { getConfig } from '../util/config.js';
import { info, log } from '../util/log.js';
import { unlinkDest } from '../util/unlinkDest.js';

import { pluginGetTitle } from './getTitle.js';
import { pluginGetVersion } from './getVersion.js';
import { pluginProcessCode } from './processCode.js';
import { pluginProcessDoc } from './processDoc.js';
import { pluginPublishVersion } from './publishVersion.js';
import { Readable } from 'stream';
import { walk } from '../util/walk.js';

/** Synchronize plugin files with the server */
export const pluginsSyncFiles = series(
  parallel(
    pluginCopyOnlineCompiledFiles,
    pluginCopyVendorFiles,
  ),
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
    .pipe(unlinkDest('.', { cwd: `${getConfig().server.root}/wp-content` }))
    .pipe(dest('.', { cwd: `${getConfig().server.root}/wp-content` }))
    .pipe(log('copy'));
}

/**
 * List composer dependencies files - exclude dev deps - and copy them on the server
 *
 * Fichiers de dépendances à n'envoyer qu'une fois
 *
 * ils sont ignorés du git, aucune modification ne devrait être faite dessus
 * ici, on ne répercute pas de changements
 */
function pluginCopyVendorFiles () {
  const composerFiles: Record<string, Record<string, any>> = {};
  const cwd = 'src/plugins';
  return walk('.', {
    async ignored (file, stats) {
      file = file.replace(RegExp(`^${cwd}/?`), '');
      const parts = file.split('/');
      const pluginName = parts.shift();
      const root = parts.shift();

      if (!pluginName || !root) return false;
      if (root !== 'vendor') return true;

      const deps = await getDeps(pluginName);

      const filename = parts.join('/');
      if (!filename && deps.length) return false;

      return !deps.some(dep => dep.startsWith(filename) || filename.startsWith(dep));
    },
    cwd,
    base: 'src',
  })
    .pipe(dest('.', { cwd: `${getConfig().server.root}/wp-content` }))
    .pipe(log('vendor'));

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

  chokidar.watch('src/plugins/', {
    depth: 0,
    ignoreInitial: false,
    ignorePermissionErrors: true,
  })
    .on('unlinkDir', all.bind(null, 'unwatch'))
    .on('addDir', all.bind(null, 'add'))
  ;

  function all (method: 'add' | 'unwatch', dirname: string) {
    const pluginName = dirname.replace(/\\/gu, '/').replace(/^src\/plugins\/?/u, '').split('/')[0];
    if (!pluginName) return;
    info('pluginWatchFiles : plugin change', { method, pluginName });
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
        stream.push(Object.assign(await vinylFile(path, { cwd: 'src/plugins', base: 'src' }), {event}));
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
  const base = `${getConfig().server.root}/wp-content/`;
  const cwd = `${base}plugins/`;
  const watcher = chokidar.watch([], {
    cwd,
    ignoreInitial: true,
    ignorePermissionErrors: true,
    ignored (path, stats) {
      return Boolean(stats?.isFile()) && !['mo', 'po', 'json'].some(ext => path.endsWith(`.${ext}`));
    },
  });

  const stream = new Readable({ objectMode: true, read () {} });
  stream
    .pipe(log((data: Vinyl) => `${data.event} online ${chalk.magenta(data.relative)}`))
    .pipe(dest('.', { cwd: 'src' }));

  watcher.on('all', async (event, path, stats) => {
    if (stats?.isFile()) {
      stream.push(Object.assign(await vinylFile(path, { cwd, base }), {event}));
    }
  });

  return {
    add (pluginName: string) { watcher.add(compiledFilesOf(pluginName)); },
    unwatch (pluginName: string) { watcher.unwatch(compiledFilesOf(pluginName)); },
  };

  function compiledFilesOf (pluginDirName: string): string {
    const pluginName = path.basename(pluginDirName);
    return `${pluginName}/languages`;
  }
}

/** Watch for compiled files, compile and copy them to the server */
function pluginWatchCompiledFiles () {
  const cwd = 'src/plugins';
  const stream = new Readable({ objectMode: true, read () {} });
  stream
    .pipe(pluginProcessDoc())
    .pipe(pluginProcessCode())
    .pipe(unlinkDest('.', { cwd: `${getConfig().server.root}/wp-content` }))
    .pipe(dest('.', { cwd: `${getConfig().server.root}/wp-content` }))
    .pipe(log('compiled'))
  ;

  const watcher = chokidar.watch('.', {
    cwd,
    ignoreInitial: false,
    ignorePermissionErrors: true,
    ignored: (file, stats) => {
      if (!stats) return false;
      if (!stats.isFile()) return true;
      if (file.endsWith('.md') || /^src\/plugins\/([^\/]*)\/\1.php$/u.test(file)) return false;
      return true;
    }
  });

  watcher
    .on('ready', ready)
    .on('all', async (event, path, stats) => {
      if (stats?.isFile()) {
        stream.push(Object.assign(await vinylFile(path, { cwd, base: 'src' }), {event}));
      }
    });


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
  const cwd = 'src/plugins';
  const watcher = chokidar.watch([], {
    cwd,
    ignoreInitial: false,
    ignorePermissionErrors: true
  });

  watcher.on('all', async (event, file, stats) => {
    if (!stats?.isFile()) return;
    const code = await fs.readFile(path.resolve(cwd, file), 'utf8');
    const version = pluginGetVersion({ code, isRequired: true });
    const title = pluginGetTitle({ code, isRequired: true });
    pluginPublishVersion({ version, title });
  });

  return {
    add (pluginName: string) { watcher.add(compiledFilesOf(pluginName)); },
    unwatch (pluginName: string) { watcher.unwatch(compiledFilesOf(pluginName)); },
  };

  function compiledFilesOf (pluginName: string) {
    return `${pluginName}/${pluginName}.php`;
  }
}

/** Display "READY" message when all the files are uploaded to the server */
let ready_count = 2;
function ready () {
  ready_count -= 1;
  if (ready_count < 0) console.error('Too much "ready" events');
  if (ready_count === 0) info(`${chalk.red('READY')} The plugins files are all uploaded`);
}
