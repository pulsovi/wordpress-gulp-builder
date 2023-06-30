import { parallel, series } from 'gulp';

import { watchBuilderChange } from './watchBuilderChange';
import { pluginsCleanServerFiles } from './pluginsCleanServerFiles';
import { pluginsSyncFiles } from './pluginsSyncFiles';
import { snippetsSync } from './snippetsSync';
import { bindDebugLog } from './bindDebugLog';

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
