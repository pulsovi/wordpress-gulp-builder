import gulp from 'gulp';

import { pipelineFollowError } from '../util/pipelineFollowError.js';

import { pluginBuild } from './build.js';

const { src } = gulp;

/** Gulp task: List plugins and build each of them */
export function pluginBuildAll () {
  return pipelineFollowError(
    src('src/plugins/*', { base: 'src' }),
    pluginBuild()
  );
}
