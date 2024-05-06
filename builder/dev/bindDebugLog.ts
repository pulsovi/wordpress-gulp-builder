import { Transform } from 'node:stream';

import chalk from 'chalk';
import gulp from 'gulp'; const { dest } = gulp;
import watch from 'gulp-watch';
import pumpify from 'pumpify';
import type Vinyl from 'vinyl';

import { getConfig } from '../util/config.js';
import { doAction } from '../util/doAction.js';
import { fs } from '../util/fs.js';
import { info, log } from '../util/log.js';
import { vinylFilter } from '../util/vinylFilter.js';

export function bindDebugLog () {
  const cwd = `${getConfig().server.root}/wp-content`;
  fs.ensureFile('./debug.log').catch(console.error);
  fs.ensureFile(`${cwd}/debug.log`).catch(console.error);
  const loader = watch('debug.log', { cwd, ignorePermissionErrors: true })
    .pipe(vinylFilter((data: Vinyl) => Boolean(data.stat!.size)))
    .pipe(onChange())
    .pipe(dest('.'));

  const cleaner = watch('src', { ignorePermissionErrors: true })
    .pipe(
      doAction(async (data: Vinyl) => {
        if (data.event !== 'change') return;
        if (!(await fs.stat(`${cwd}/debug.log`)).size) return;
        info(`${data.event} ${chalk.magenta(data.relative)}, truncate debug.log`);
        await fs.truncate(`${cwd}/debug.log`);
      })
    );

  return cleaner;

  /**
   * Handle debug.log file change
   */
  function onChange (): Transform {
    return new Transform({
      objectMode: true,
      async transform (data: Vinyl, _encoding, cb) {
        try {
          if ('function' !== typeof data.contents?.toString) return;
          const content: string = data.contents.toString()
            .replace(/\r\n|\r/gu, '\n')        // Windows and Mac LE
            .replace(/\n\n+(?!\[|$)/gu, '\n'); // Multiple LF inside one stack

          if (!content.endsWith('\n\n')) try {
            fs.writeFileSync(data.path, content + '\n', 'utf8');
          } catch (_error) { /* do nothing */ }

          const index = content.lastIndexOf('\n\n[');
          const start = ~index ? index + 2 : 0;
          const stop = Math.max(start + 150, Math.min(start + 1000, content.indexOf('\n', start)));
          const startLine = content.slice(0, start).split('\n').length;
          const message = content.slice(start, stop).replace(/\n/gu, '\\n');
          info('Error: ' + chalk.red(message) + '\nsee debug.log file line' + startLine);

          this.push(data);
          cb();
        } catch (error) { cb(error); }
      }
    });
  }
}
