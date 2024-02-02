import gulp from 'gulp'; const { parallel } = gulp;

import { pluginBuildAll } from '../plugin/buildAll.js';
import { snippetBuildAll } from '../snippet/buildAll.js';
import { onIdle } from '../util/onIdle.js';

export const build = parallel(
  pluginBuildAll,
  snippetBuildAll,
  onIdle.start,
);
