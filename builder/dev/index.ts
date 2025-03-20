import gulp from 'gulp'; const { parallel } = gulp;

import { snippetsSync } from '../snippet/sync.js';
import { pluginsSync } from '../plugin/sync.js';

import { bindDebugLog } from './bindDebugLog.js';

export const dev = parallel(
  //watchBuilderChange,
  pluginsSync,
  snippetsSync,
  bindDebugLog,
);
