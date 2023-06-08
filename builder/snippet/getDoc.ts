import type Stream from 'stream';

import { src } from 'gulp';

import { snippetGetDocFile } from './getFile';
import { snippetProcessDoc } from './processDoc';

/** Get the HTML doc of a snippet as a stream */
export function snippetGetDoc (snippetName: string, isRequired = false): Stream.Duplex {
  const docFile = snippetGetDocFile(snippetName);
  return src(docFile, { allowEmpty: !isRequired })
    .pipe(snippetProcessDoc());
}
