import { dest } from 'gulp';
import watch from 'gulp-watch';
import pumpify from 'pumpify';
import type Vinyl from 'vinyl';

import { config } from '../util/config';
import { doAction } from '../util/doAction';
import { fs } from '../util/fs';
import { log } from '../util/log';
import { vinylFilter } from '../util/vinylFilter';

export function bindDebugLog () {
  const cwd = `${config.server.root}/wp-content`;
  fs.ensureFile('./debug.log').catch(console.error);
  fs.ensureFile(`${cwd}/debug.log`).catch(console.error);
  const loader = watch('debug.log', { cwd })
    .pipe(vinylFilter((data: Vinyl) => Boolean(data.stat!.size)))
    .pipe(log('Error: ', data => (data.contents!.toString().split('\n').shift() ?? '') + '\nsee debug.log file'))
    .pipe(dest('.'));

  const cleaner = watch('src/**/*')
    .pipe(doAction(async (data: Vinyl) => {
      if (!(await fs.stat(`${cwd}/debug.log`)).size) return;
      if (data.event === 'change') await fs.truncate(`${cwd}/debug.log`);
    }));

  return pumpify.obj([loader, cleaner]);
}
