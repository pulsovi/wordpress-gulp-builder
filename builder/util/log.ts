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
      const prefixStr = prefix ?
        (data.event ? `${prefix} ${data.event}\n` : `${prefix}\n`) :
        (data.event ? `${data.event}\n` : '');
      //const relative = chalk.magenta(data.relative.padStart(dest.length).padStart(src.length));
      const from = `${chalk.red(src.padStart(dest.length))} =>`;
      const to = `${chalk.green(dest.padStart(src.length))}`;
      return `${prefixStr}${from}\n${to}\n`;
  });
}

export function info (...msg) {
  fancyLog.info(...msg);
}
