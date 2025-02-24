import Stream from 'stream';

import chalk from 'chalk';
import gulp from 'gulp';
import zip from 'gulp-zip';
import type Vinyl from 'vinyl';

import { fs } from '../util/fs.js';
import { log } from '../util/log.js';
import { pipelineFollowError } from '../util/pipelineFollowError.js';
import { doAction } from '../util/doAction.js';

import { pluginGetFile } from './getFile.js';
import { pluginGetVersion } from './getVersion.js';
import { pluginProcessDoc } from './processDoc.js';
import { pluginPublishVersion } from './publishVersion.js';
import { filter } from '../util/filter.js';
import npath from 'path';

const { dest, series, src } = gulp;

/** Get plugin names and build them */
export function pluginBuild () {
  return new Stream.Writable({
    objectMode: true,
    async write (data: Vinyl, _encoding, cb) {
      const pluginName = data.basename;
      if (!await fs.exists(pluginGetFile(pluginName))) {
        log(`Unable to find the main file for the plugin "${pluginName}"`);
        cb();
        return;
      }
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
    filterVendorFiles(pluginName),
    pluginProcessDoc(),
    zip(zipFile),
    dest('build/plugins'),
    log(data => `${chalk.blue(pluginName)} v${chalk.yellow(version)} PLUGIN successfully built`),
    doAction(async () => { await pluginPublishVersion({ name: pluginName, version }); }),
  );
}

function filterVendorFiles (pluginName) {
  const deps = getDeps(pluginName);

  return filter(async file => {
    if (file.isDirectory()) return false;
    const dependencies = await deps;
    let path = file.relative.replace(/\\/gu, '/').replace(`${pluginName}/`, '');
    if (!path.startsWith('vendor')) return true;
    if (!dependencies.length) return false;
    path = path.replace('vendor/', '');
    return dependencies.some(item => path.startsWith(item));
  }, { restore: false });
}

async function getDeps (pluginName) {
  const composerFile = npath.resolve('src/plugins', pluginName, 'composer.lock');
  try {
    const json = await fs.readJson(composerFile);
    return json.packages.map(pkg => pkg.name);
  } catch (_error) {
    return [];
  }
}
