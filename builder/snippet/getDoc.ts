import type Stream from 'stream';

import { src } from 'gulp';

import { snippetGetDocFile } from './getFile';
import { snippetProcessDoc } from './processDoc';

import { pipelineFollowError } from '../util/pipelineFollowError';
import { streamToString } from '../util/streamToString';

/** Get the HTML doc of a snippet as a stream */
export async function snippetGetDoc (snippetName: string, isRequired = false): Promise<string> {
  const docFile = snippetGetDocFile(snippetName);
  return await pipelineFollowError(
    src(docFile, { allowEmpty: !isRequired }),
    snippetProcessDoc(),
    streamToString()
  );
}
