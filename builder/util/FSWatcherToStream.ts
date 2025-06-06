import npath from 'node:path';
import { Readable } from "node:stream";

import type { FSWatcher } from 'chokidar';
import { vinylFile, type Options as VinylOptions } from 'vinyl-file';
import fs from 'fs-extra';

export default function FSWatcherToStream(
  watcher: FSWatcher, options: { base?: string } = {}
): Readable {
  const stream = new Readable({ objectMode: true, read() {} });
  watcher.on('all', async (event: string, path: string) => {
    const cwd = watcher.options.cwd ?? process.cwd();
    const base = options.base;
    const realpath = npath.resolve(cwd, path);
    const stats = await fs.stat(realpath);
    const isDirectory = stats.isDirectory();
    const opts: VinylOptions = Object.assign(
      {},
      base ? { base } : {},
      cwd ? { cwd } : {},
      isDirectory ? { read: false } : {},
    );

    try {
      const vinyl = await vinylFile(path, opts);
      stream.push(Object.assign(vinyl, { event }));
    } catch (error) {
      console.log(error);
    }
  });

  return stream;
}
