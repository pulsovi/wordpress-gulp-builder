import { parallel, series } from 'gulp';

import { pluginsCleanServerFiles } from '../plugin/cleanServerFiles';
import { pluginsSyncFiles } from '../plugin/syncFiles';
import { snippetsSync } from '../snippet/sync';

import { bindDebugLog } from './bindDebugLog';
import { watchBuilderChange } from './watchBuilderChange';

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
