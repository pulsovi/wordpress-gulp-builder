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
    .on('error', error => { info('bindDebugLog loader watcher error', error); })
    .pipe(
      vinylFilter((data: Vinyl) => Boolean(data.stat!.size))
      .on('error', error => { info('bindDebugLog loader vinylFilter error', error); })
    )
    .pipe(
      log('Error:', data => {
        const lines = data.contents!.toString().split('\n') || [''];
        const message = lines[0].length < 100 ? lines.join('\\n').slice(0, 100) : lines[0];
        return chalk.red(message) + ' see debug.log file';
      })
      .on('error', error => { info('bindDebugLog loader log error', error); })
    )
    .pipe(
      dest('.')
      .on('error', error => { info('bindDebugLog loader dest error', error); })
    );

  const cleaner = watch('src', { ignorePermissionErrors: true })
    .on('error', error => { info('bindDebugLog cleaner watcher error', error); })
    .pipe(
      doAction(async (data: Vinyl) => {
        if (data.event !== 'change') return;
        if (!(await fs.stat(`${cwd}/debug.log`)).size) return;
        info(`${data.event} ${chalk.magenta(data.relative)}, truncate debug.log`);
        await fs.truncate(`${cwd}/debug.log`);
      })
      .on('error', error => { info('bindDebugLog cleaner doAction error', error); })
    );

  return cleaner;
}
