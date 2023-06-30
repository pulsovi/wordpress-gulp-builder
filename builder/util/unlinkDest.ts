import path from 'path';
import Stream from 'stream';

import { fs } from './fs';

/**
 * Delete dest file if File.event === 'unlink'
 */
export function unlinkDest (outFolder, opt) {
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
      default:
        cb(new Error('ERROR unlinkDest : Unknown event' + data.event));
    }
    cb?.();
  }
  return stream;
}
