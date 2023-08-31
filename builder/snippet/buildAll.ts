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
    .pipe(log(data => {
      const title = JSON.parse(data.contents!.toString()).snippets[0].name;
      return `${chalk.blue(title)} v${chalk.yellow(data.version)} SNIPPET successfully built`
    }));
}
