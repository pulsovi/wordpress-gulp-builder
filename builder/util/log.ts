import Stream from 'stream';

import type Vinyl from 'vinyl';

export function log (prefix = '', transformer = data => [data.event, data.path].join(' ')) {
  if (typeof prefix === 'function') {
    transformer = prefix;
    prefix = '';
  }

  return new Stream.Transform({
    objectMode: true,
    transform (data: Vinyl, _encoding, cb) {
      console.debug(prefix, transformer(data));
      cb(null, data);
    }
  });
}
