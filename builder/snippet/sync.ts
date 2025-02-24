import { Readable } from 'node:stream';

import type { TaskFunctionCallback } from 'gulp';
import { watch } from 'chokidar';
import { vinylFile } from 'vinyl-file';

import { log } from '../util/log.js';
import { snippetProcessCode } from '../snippet/processCode.js';
import { snippetProcessDoc } from '../snippet/processDoc.js';
import { snippetHotUpdate } from '../snippet/hotUpdate.js';

/** Watch on snippets dir and update the server version of the snippet on each change */
export function snippetsSync (cb: TaskFunctionCallback) {
  const stream = new Readable({ objectMode: true, read () {} });
  watch(`src/snippets/`, { ignoreInitial: false })
    .on('all', async (event, file, stats) => {
      if (stats?.isFile()) stream.push(Object.assign(await vinylFile(file), { event }));
    });

  return stream
    .pipe(log())
    .pipe(snippetProcessDoc())
    .pipe(snippetProcessCode({ follow: true }))
    .pipe(snippetHotUpdate());
}
