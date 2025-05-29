import npath from 'node:path';
import Stream from 'node:stream';

import chalk from 'chalk';
import gulp from 'gulp'; const { dest, series, src } = gulp;
import zip from 'gulp-zip';
import type Vinyl from 'vinyl';

import { fs } from '../util/fs.js';
import { info, log } from '../util/log.js';
import { pipelineFollowError } from '../util/pipelineFollowError.js';
import { doAction } from '../util/doAction.js';

import { pluginGetFile } from './getFile.js';
import { pluginGetVersion } from './getVersion.js';
import { pluginProcessDoc } from './processDoc.js';
import { pluginPublishVersion } from './publishVersion.js';
import { walk } from '../util/walk.js';
import { pluginIgnoreFilter } from './ignoreFilter.js';
import { escapeRegExp } from '../util/regex.js';
import { confirm } from '../util/confirm.js';

/** return stream.Writable which get plugins root folder as Vinyl and build them */
export function pluginBuild() {
  return new Stream.Writable({
    objectMode: true,
    async write(data: Vinyl, _encoding, cb) {
      const pluginName = data.basename;
      if (
        process.argv.some(arg => arg.startsWith('--plugin') || arg.startsWith('--snippet'))
        && !process.argv.some(
          arg => new RegExp(`^--plugin=(['"]?)${escapeRegExp(pluginName)}\\1$`).test(arg)
        )
      ) {
        log(`filtered build not include "${pluginName}"`);
        cb(); return;
      }
      if (!await fs.exists(pluginGetFile(pluginName))) {
        log(`Unable to find the main file for the plugin "${pluginName}"`);
        cb();
        return;
      }
      const version = await pluginGetVersion({ async: true, name: pluginName, isRequired: true });
      const displayName = `pluginBuild_${pluginName}`;
      const task = Object.assign(cb => pluginBuildTask(pluginName, version, cb), { displayName });
      series(task)(cb);
    }
  });
}

/** Gulp task: build given plugin by name and version */
async function pluginBuildTask(pluginName: string, version: string, cb: (error?: Error) => void) {
  const zipFile = `${pluginName}/${pluginName}_${version}.zip`;
  if (await fs.exists(npath.join('build/plugins', zipFile))) {
    const override = await confirm(chalk.redBright(`The version ${chalk.yellow(version)} of the plugin ${chalk.blue(pluginName)} already built. Override ?`));
    if (!override) {
      info(chalk.redBright(`pluginBuildTask CANCELED for ${chalk.blue(pluginName)} v${chalk.yellow(version)}`));
      return cb();
    }
  }
  return pipelineFollowError(
    walk(`${pluginName}`, {
      cwd: 'src/plugins',
      base: 'src/plugins',
      ignored: pluginIgnoreFilter(pluginName),
    }),
    pluginProcessDoc(),
    zip(zipFile),
    dest('build/plugins'),
    log(data => `${chalk.blue(pluginName)} v${chalk.yellow(version)} PLUGIN successfully built`),
    doAction(async () => { await pluginPublishVersion({ name: pluginName, version }); }),
  );
}
