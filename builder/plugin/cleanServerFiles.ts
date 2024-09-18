import path from 'path';

import { fs } from '../util/fs.js';
import { getConfig } from '../util/config.js';
import gulp from 'gulp';
import { Stream } from 'stream';
import type Vinyl from 'vinyl';

const { src } = gulp;

/** Delete from server all plugins managed here */
export async function pluginsCleanServerFiles (cb) {
  const knownPlugins = await fs.readdir('src/plugins', { withFileTypes: true });
  const serverPluginFolder = path.join(getConfig().server.root, 'wp-content/plugins');
  const sources = knownPlugins
    .filter(dirent => dirent.isDirectory())
    .map(plugin => path.join(getConfig().server.root, 'wp-content/plugins', plugin.name, '**'));

  if (!sources.length) {
    cb();
    return;
  }

  return src(sources, { base: serverPluginFolder, read: false })
    .pipe(new Stream.Writable({
      objectMode: true,
      async write (file: Vinyl, __encoding, cb) {
        if (file.isDirectory()) return cb();
        if (await fs.exists(path.join('src/plugins', file.relative))) return cb();
        await fs.unlink(file.path);
        cb();
      }
    }));
}
pluginsCleanServerFiles.displayName = 'pluginsCleanServerFiles';
