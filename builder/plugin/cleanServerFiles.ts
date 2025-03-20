import path from 'node:path';
import { pipeline, Writable } from 'node:stream';

import gulp from 'gulp'; const { src } = gulp;
import type Vinyl from 'vinyl';

import { fs } from '../util/fs.js';
import { getConfig } from '../util/config.js';

/**
 * Gulp task: Delete from server all plugins managed here
 */
export async function pluginsCleanServerFiles (taskCb) {
  const knownPlugins = await fs.readdir('src/plugins', { withFileTypes: true });
  const serverPluginFolder = path.join(getConfig().server.root, 'wp-content/plugins');
  const sources = knownPlugins
    .filter(dirent => dirent.isDirectory())
    .map(plugin => path.join(getConfig().server.root, 'wp-content/plugins', plugin.name, '**'));

  if (!sources.length) return taskCb();

  return pipeline(
    src(sources, { base: serverPluginFolder, read: false }),
    fileUnlinker()
  );
}
// pluginsCleanServerFiles.displayName = 'pluginsCleanServerFiles';

function fileUnlinker () {
  return new Writable({
    objectMode: true,
    async write (file: Vinyl, _encoding, cb) {
      if (!await fs.exists(path.join('src/plugins', file.relative))) {
        if (file.isDirectory()) await fs.rm(file.path, {recursive: true});
        else await fs.unlink(file.path);
      }
      cb();
    }
  });
}
