import path from 'node:path';
import { pipeline, Transform } from 'node:stream';

import chalk from 'chalk';
import gulp from 'gulp'; const { dest, parallel } = gulp;
import { watch } from 'chokidar';
import type Vinyl from 'vinyl';

import { getConfig } from '../util/config.js';
import { fs } from '../util/fs.js';
import { info } from '../util/log.js';
import { vinylFilter } from '../util/vinylFilter.js';
import FSWatcherToStream from '../util/FSWatcherToStream.js';

/**
 * Gulp task which watch on the debug.log file and:
 * - mirror it in cwd
 * - clean it when the plugin code change
 */
export function bindDebugLog (cb) {
  return parallel(
    watcher,
    cleaner,
  )(cb);
}

/**
 * Gulp task which watch on the debug.log file and mirror it in cwd
 */
function watcher () {
  const cwd = `${getConfig().server.root}/wp-content`;

  fs.ensureFile('./debug.log').catch(console.error);
  fs.ensureFile(`${cwd}/debug.log`).catch(console.error);

  return pipeline(
    FSWatcherToStream(
      watch('debug.log', { cwd, ignorePermissionErrors: true })
        .on('error', error => console.log('bindDebugLog.watcher.watch error:', error))
    ),
    vinylFilter((data: Vinyl) => {
      return Boolean(data.stat?.size);
    }),
    onChange(),
    dest('.'),
    error => { if (error) console.error(error); }
  );
}
watcher.displayName = 'bindDebugLog_watcher';

/**
 * Return a stream.Transform to handle debug.log file change
 */
function onChange (): Transform {
  return new Transform({
    objectMode: true,
    async transform (data: Vinyl, _encoding, cb) {
      try {
        if ('function' !== typeof data.contents?.toString) return;
        let content: string = data.contents.toString()
          // Windows and Mac LE
          .replace(/\r\n|\r/gu, '\n')
          // Multiple LF inside one stack
          .replace(/\n\n+(?!\[|$)/gu, '\n')
          // New stack not preceded by an empty line
          .replace(/(?<!\n)(\n\[[^\]]*\])(?!  | Automatic updates c| PHP +\d| PHP Stack trace)/gu, '\n$1')

        content = await replacePluginsPath(content);

        const index = content.lastIndexOf('\n\n[');
        const start = ~index ? index + 2 : 0;
        const stop = Math.max(start + 150, Math.min(start + 1000, content.indexOf('\n', start)));
        const startLine = content.slice(0, start).split('\n').length;
        const message = content.slice(start, stop).replace(/\n/gu, '\\n');
        info('debug.log:\n' + chalk.red(message) + '\nsee debug.log file line ' + startLine);

        data.contents = Buffer.from(content);
        this.push(data);
        cb();
      } catch (error) { cb(error); }
    }
  });
}

/**
 * Replace path of the dev plugin in debug.log
 *
 * @unreleased
 */
async function replacePluginsPath (content: string) {
  const plugins = (await fs.readdir('src/plugins', { withFileTypes: true }))
    .filter(item => item.isDirectory())
    .map(item => item.name);
  const srcRoot = path.join(process.cwd(), 'src/plugins');
  const dstRoot = path.join(getConfig().server.root, 'wp-content/plugins');
  for (const plugin of plugins) {
    const srcPlugin = path.join(srcRoot, plugin).replace(/\\/gu, '/');
    const dstPlugin = path.join(dstRoot, plugin);
    while (content.includes(dstPlugin)) {
      content = content.replace(dstPlugin, srcPlugin);
    }
  }
  return content;
}

/**
 * Gulp task which empty the server debug.log file when a file of this project change
 */
function cleaner () {
  const cwd = `${getConfig().server.root}/wp-content`;
  return watch('src', {
    ignorePermissionErrors: true,
    ignored (file) {
      return /vendor|node_module|tests|coverage/u.test(file);
    }
  })
    .on('error', error => console.log('bindDebugLog.cleaner watch error:', error))
    .on('change', async file => {
      const stats = await fs.stat(`${cwd}/debug.log`).catch(() => null);
      if (!stats || !stats.size) return;
      info(`change ${chalk.magenta(file)}, truncate debug.log`);
      await fs.truncate(`${cwd}/debug.log`);
    });
}
cleaner.displayName = 'bindDebugLog_cleaner';
