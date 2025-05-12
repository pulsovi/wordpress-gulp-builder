import chalk from 'chalk';
import gulp from 'gulp'; const { dest, src } = gulp;

import { log } from '../util/log.js';

import { snippetBuild } from './build.js';

/** List snippets and build each of them */
export function snippetBuildAll() {
  return src('./src/snippets/*/', { base: 'src' })
    .pipe(snippetBuild())
    .pipe(dest('./build'))
    .pipe(log(data => {
      const title = JSON.parse(data.contents!.toString()).snippets[0].name;
      return `${chalk.blue(title)} v${chalk.yellow(data.version)} SNIPPET successfully built`
    }));
}
