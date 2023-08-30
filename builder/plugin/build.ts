import Stream from 'stream';

import chalk from 'chalk';
import { dest, series, src } from 'gulp';
import zip from 'gulp-zip';
import type Vinyl from 'vinyl';

import { log } from '../util/log';
import { pipelineFollowError } from '../util/pipelineFollowError';

import { pluginGetVersion } from './getVersion';
import { pluginProcessDoc } from './processDoc';

/** Get plugin names and build them */
export function pluginBuild () {
  return new Stream.Writable({
    objectMode: true,
    async write (data: Vinyl, _encoding, cb) {
      const pluginName = data.basename;
      const version = await pluginGetVersion({ async: true, name: pluginName, isRequired: true });
      const displayName = `pluginBuild_${pluginName}`;
      const task = Object.assign(() => pluginBuildTask(pluginName, version), { displayName });
      series(task)(cb);
    }
  });
}

function pluginBuildTask (pluginName, version) {
  const zipFile = `${pluginName}/${pluginName}_${version}.zip`;
  return pipelineFollowError(
    src(`${pluginName}/**/*`, { cwd: 'src/plugins', base: 'src/plugins' }),
    pluginProcessDoc(),
    zip(zipFile),
    dest('build/plugins'),
    log(data => `${chalk.blue(pluginName)} v${chalk.yellow(version)} PLUGIN successfully built`)
  );
}
