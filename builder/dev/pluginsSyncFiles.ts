import { dest, src, parallel } from 'gulp';
import watch from 'gulp-watch';
import Vinyl from 'vinyl';

import { pluginProcessCode } from '../plugin/processCode';
import { pluginProcessDoc } from '../plugin/processDoc';
import { config } from '../util/config';
import { filter } from '../util/filter';
import { fs } from '../util/fs';
import { log, logMove } from '../util/log';
import { pipelinePart } from '../util/pipelinePart';
import { unlinkDest } from '../util/unlinkDest';

/** Synchronize plugin files with the server */
export const pluginsSyncFiles = parallel(
  pluginWatchSimpleFiles,
  pluginCopyOnlineCompiledFiles,
  pluginWatchOnlineCompiledFiles,
  pluginWatchCompiledFiles,
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
  const fileTypes = ['css', 'js', 'php', 'pot'].map(ext => `**/*.${ext}`);
  return watch(fileTypes, { cwd: 'src/plugins/', ignoreInitial: false })
    .pipe(filter(data => !data.relative.match(/([^\/\\]*)(?:\/|\\)\1.php$/), { restore: false }))
    .pipe(log())
    .pipe(unlinkDest('.', { cwd: `${config.server.root}/wp-content` }))
    .pipe(dest('.', { cwd: `${config.server.root}/wp-content` }))
}

/** Watch for online compiled files and copy them here */
async function pluginWatchOnlineCompiledFiles (pluginName) {
  return watch(
    ['**/*.mo', '**/*.po'],
    {cwd: `${config.server.root}/wp-content/plugins/`, ignoreInitial: true }
  )
    .pipe(dest('.', { cwd: 'src' }))
    .pipe(log());
}

/** Watch for compiled files, compile and copy them to the server */
async function pluginWatchCompiledFiles () {
  const plugins = (await fs.readdir('src/plugins', { withFileTypes: true }))
    .filter(dirent => dirent.isDirectory())
    .map(dirent => `${dirent.name}/${dirent.name}.php`);

  return watch([...plugins, '**/*.md'], { cwd: 'src/plugins', ignoreInitial: false })
    .pipe(pluginProcessDoc())
    .pipe(pluginProcessCode())
    .pipe(dest('.', { cwd: `${config.server.root}/wp-content` }))
    .pipe(log())
}
