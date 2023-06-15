import path from 'path';

import chalk from 'chalk';
import { dest, src } from 'gulp';

import { log } from '../util/log';

import { snippetBuild } from './build';

/** List snippets and build each of them */
export function snippetBuildAll () {
  return src('./src/snippets/*', { base: 'src' })
    .pipe(snippetBuild())
    .pipe(dest('./build'))
    .pipe(log(data => `${chalk.blue(path.basename(data.history[0]))} SNIPPET successfully built`));
}
