import Stream from 'stream';

import type Vinyl from 'vinyl';

interface StreamToStringOptions {
  /** what to do if more than one file is given to the toString stream */
  other: 'error' | 'ignore';
}

/** Return a StreamWritable with .then() method wich return the contents of the Vinyl */
export function streamToString (options?: StreamToStringOptions): Stream.Writable & PromiseLike<string> {
  const stream = new Stream.Writable({ objectMode: true });
  const result = new Promise<string>((resolve, reject) => {
    let end = false;

    stream._write = (data: Vinyl, _encoding, cb) => {
      try {
        if (end) {
          if (options?.other === 'ignore') return cb();
          cb(new Error('Only one vinyl can be stringified'));
          return;
        }

        end = true;
        resolve(data.contents!.toString());
        cb();
      } catch (error) {
        stop();
        console.log('STREAM TO STRING ERROR', error);
        cb();
      }
    }

    stream.once('error', error => reject(error));
    stream.once('close', () => { if (!end) resolve(''); });
    stream.once('end', () => { if (!end) resolve(''); });
  });
  const promise: PromiseLike<string> = { then(...args) { return result.then(...args); }};
  return Object.assign(stream, promise);
}
