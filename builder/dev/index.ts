import gulp from 'gulp'; const { parallel, series } = gulp;

import { pluginsCleanServerFiles } from '../plugin/cleanServerFiles.js';
import { pluginsSyncFiles } from '../plugin/syncFiles.js';
import { snippetsSync } from '../snippet/sync.js';

import { bindDebugLog } from './bindDebugLog.js';
import { watchBuilderChange } from './watchBuilderChange.js';

const pluginDev = series(
  pluginsCleanServerFiles,
  pluginsSyncFiles,
);

export const dev = parallel(
  watchBuilderChange,
  pluginDev,
  snippetsSync,
  bindDebugLog,
);
