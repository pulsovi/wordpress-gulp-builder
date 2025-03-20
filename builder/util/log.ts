import Stream from 'stream';

import chalk from 'chalk';
import fancyLog from 'fancy-log';
import type Vinyl from 'vinyl';
import lead from 'lead';

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

  const stream = new Stream.Transform({
    objectMode: true,
    transform (data: Vinyl, _encoding, cb) {
      try {
        if (prefix) info(prefix, transformer(data));
        else info(transformer(data));
        this.push(data);
      } catch (error) {
        cb(error);
        return;
      }
      cb();
    }
  });

  return lead(stream);
}

export function logMove (prefix?: string) {
  return log((data: Vinyl) => {
      const src = data.history[0];
      const dest = data.history.slice(-1)[0];
      const prefixStr = ('string' === typeof prefix) ? `${prefix}\n` : '';
      const from = `${src.padStart(dest.length)} =>\n`;
      const to = `${dest.padStart(src.length)} \n`;
      return `${prefixStr}${from}\n${to}`;
  });
}

export function info (...msg) {
  fancyLog.info(...msg);
}
