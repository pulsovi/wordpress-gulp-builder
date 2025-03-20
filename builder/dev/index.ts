import gulp from 'gulp'; const { parallel, series } = gulp;

import { snippetsSync } from '../snippet/sync.js';

import { bindDebugLog } from './bindDebugLog.js';
import { watchBuilderChange } from './watchBuilderChange.js';
import { pluginsSync } from '../plugin/sync.js';

export const dev = parallel(
  //watchBuilderChange,
  pluginsSync,
  snippetsSync,
  bindDebugLog,
);
