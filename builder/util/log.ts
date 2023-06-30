import Stream from 'stream';

import type Vinyl from 'vinyl';

export function log (prefix?: string, transformer?: (data: Vinyl) => string): Stream.Transform;
export function log (transformer: (data: Vinyl) => string): Stream.Transform;
export function log (prefix: string | ((data: Vinyl) => string) = '', transformer = (data: Vinyl) => [data.event, data.relative].join(' ')): Stream.Transform {
  if (typeof prefix === 'function') {
    transformer = prefix;
    prefix = '';
  }

  return new Stream.Transform({
    objectMode: true,
    transform (data: Vinyl, _encoding, cb) {
      if (prefix) console.debug(prefix, transformer(data));
      else console.debug(transformer(data));
      cb(null, data);
    }
  });
}

export function logMove (prefix?: string) {
  return new Stream.Transform({
    objectMode: true,
    transform (data: Vinyl, _encoding, cb) {
      const src = data.history[0];
      const dest = data.history.slice(-1)[0];
      if ('string' === typeof prefix) console.debug(prefix);
      console.debug(src.padStart(dest.length), '=>');
      console.debug(dest.padStart(src.length), '\n');
      cb(null, data);
    },
  });
}
