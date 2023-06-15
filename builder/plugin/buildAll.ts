import { dest, src } from 'gulp';

import { log } from '../util/log';
import { pipelineFollowError } from '../util/pipelineFollowError';

import { pluginBuild } from './build';

/** List plugins and build each of them */
export function pluginBuildAll () {
  return pipelineFollowError(
    src('src/plugins/*', { base: 'src' }),
    pluginBuild()
  );
}
