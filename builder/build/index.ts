import { parallel } from 'gulp';

import { pluginBuildAll } from '../plugin/buildAll';
import { snippetBuildAll } from '../snippet/buildAll';
import { onIdle } from '../util/onIdle';

export const build = parallel(
  pluginBuildAll,
  snippetBuildAll,
  onIdle.start,
);
