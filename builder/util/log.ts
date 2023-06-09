import Stream from 'stream';

import chalk from 'chalk';
import fancyLog from 'fancy-log';
import type Vinyl from 'vinyl';

export function log (prefix?: string, transformer?: (data: Vinyl) => string): Stream.Transform;
export function log (transformer: (data: Vinyl) => string): Stream.Transform;
export function log (
  prefix: string | ((data: Vinyl) => string) = '',
  transformer = (data: Vinyl) => [data.event, chalk.magenta(data.relative)].join(' ')
): Stream.Transform {
  if (typeof prefix === 'function') {
    transformer = prefix;
    prefix = '';
  }

  return new Stream.Transform({
    objectMode: true,
    transform (data: Vinyl, _encoding, cb) {
      if (prefix) info(prefix, transformer(data));
      else info(transformer(data));
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
      if ('string' === typeof prefix) info(prefix);
      info(src.padStart(dest.length), '=>');
      info(dest.padStart(src.length), '\n');
      cb(null, data);
    },
  });
}

export function info (...msg) {
  fancyLog.info(...msg);
}
