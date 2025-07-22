import npath from 'node:path';
import { Readable } from "node:stream";

import type { FSWatcher } from 'chokidar';
import File from 'vinyl';
import { vinylFile, type Options as VinylOptions } from 'vinyl-file';

import {fs} from './fs.js';

export default function FSWatcherToStream(
  watcher: FSWatcher, options: { base?: string } = {}
): Readable {
  const stream = new Readable({ objectMode: true, read() {} });
  watcher.on('all', async (event: string, path: string) => {
    const cwd = watcher.options.cwd ?? process.cwd();
    const base = options.base;
    const realpath = npath.resolve(cwd, path);
    const stats = await fs.stat(realpath).catch(error => null);

    if (!stats) {
      const vinyl = new File({ cwd, base, path });
      stream.push(Object.assign(vinyl, { event }));
      return;
    }

    const opts: VinylOptions = Object.assign(
      {},
      base ? { base } : {},
      cwd ? { cwd } : {},
      stats?.isDirectory() ? { read: false } : {},
    );

    try {
      const vinyl = await vinylFile(path, opts);
      stream.push(Object.assign(vinyl, { event }));
    } catch (error) {
      console.log('util/FSWatcherToStream error:', error);
    }
  });

  return stream;
}
