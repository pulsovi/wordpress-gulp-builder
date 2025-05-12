import path from 'path';
import Stream from 'stream';

import { fs } from './fs.js';

/**
 * Return a Transform stream of Vinyl which deletes dest file when
 * `File.event === 'unlink'` and follows all other files to its output
 */
export function unlinkDest(outFolder: string, opt: { cwd: string }) {
  const stream = new Stream.Transform({ objectMode: true });
  stream._transform = async function (data, _encoding, cb) {
    switch (data.event) {
      case undefined:
      case 'add':
      case 'change':
        this.push(data);
        break;
      case 'unlink':
        await fs.rm(path.join(opt?.cwd ?? '.', outFolder, data.relative));
        break;
      case 'addDir':
        break;
      default:
        console.log('ERROR unlinkDest : Unknown event ' + data.event);
        cb(new Error('ERROR unlinkDest : Unknown event ' + data.event));
        return;
    }
    cb?.();
  }
  return stream;
}
