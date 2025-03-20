import { pipeline } from 'node:stream';

import type Vinyl from 'vinyl';

import { walk } from '../util/walk';
import { log } from '../util/log';
import { pluginsIgnoreFilter } from './ignoreFilter';
import chalk from 'chalk';
import { pluginsSendFileToServer } from './sendFileToServer';

/**
 * Gulp task: copy all files
 */
export function pluginCopyFiles () {
  let count = 0;
  const source = walk('.', {
    ignored: pluginsIgnoreFilter,
    cwd: 'src/plugins',
    base: 'src/plugins',
  });

  return pipeline(
    source,
    pluginsSendFileToServer(),
    log((data: Vinyl) => `plugin copy ${chalk.bgGreenBright(++count)} ${chalk.magenta(data.relative)}`),
  );
}
