import Stream from 'stream';

import type Vinyl from 'vinyl';

export function log (prefix?: string, transformer?: (data: Vinyl) => string): Stream.Transform;
export function log (transformer: (data: Vinyl) => string): Stream.Transform;
export function log (prefix: string | ((data: Vinyl) => string) = '', transformer = (data: Vinyl) => [data.event, data.path].join(' ')): Stream.Transform {
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
