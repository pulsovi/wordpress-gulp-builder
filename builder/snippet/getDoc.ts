import type Stream from 'stream';

import gulp from 'gulp'; const { src } = gulp;

import { snippetGetDocFile } from './getFile.js';
import { snippetProcessDoc } from './processDoc.js';

import { pipelineFollowError } from '../util/pipelineFollowError.js';
import { streamToString } from '../util/streamToString.js';

/** Get the HTML doc of a snippet as a stream */
export async function snippetGetDoc (snippetName: string, isRequired = false): Promise<string> {
  const docFile = snippetGetDocFile(snippetName);
  return await pipelineFollowError(
    src(docFile, { allowEmpty: !isRequired }),
    snippetProcessDoc(),
    streamToString()
  );
}
