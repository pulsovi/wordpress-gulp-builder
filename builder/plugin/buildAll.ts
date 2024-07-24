import gulp from 'gulp';

import { pipelineFollowError } from '../util/pipelineFollowError.js';

import { pluginBuild } from './build.js';

const { src } = gulp;

/** List plugins and build each of them */
export function pluginBuildAll () {
  return pipelineFollowError(
    src('src/plugins/*', { base: 'src' }),
    pluginBuild()
  );
}
