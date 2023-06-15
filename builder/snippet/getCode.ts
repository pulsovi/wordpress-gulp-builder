import { src } from 'gulp';

import { pipelineFollowError } from '../util/pipelineFollowError';
import { streamToString } from '../util/streamToString';

import { snippetProcessCode } from './processCode';
import { snippetGetFile } from './getFile';

/** Get and compile snippet code given it's root folder Vinyl */
export async function snippetGetCode (snippetName: string, allowEmpty: false): Promise<string>;
export async function snippetGetCode (snippetName: string, allowEmpty?: true): Promise<string | undefined>;
export async function snippetGetCode (snippetName: string, allowEmpty = true): Promise<string | undefined> {
  return await pipelineFollowError(
    src(snippetGetFile(snippetName), { allowEmpty }),
    snippetProcessCode(),
    streamToString()
  );
}
