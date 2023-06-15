import Stream from 'stream';

import StreamFilter from 'streamfilter';
import type Vinyl from 'vinyl';

import { pipelinePart } from '../util/pipelinePart';

import { snippetGetFile } from './getFile';
import { snippetGetName } from './getName';
import { snippetPhpPreprocessor } from './phpPreprocessor';

/** Return a Stream.Transform which process snippet code file */
export function snippetProcessCode (): Stream.Duplex {
  const filter = new StreamFilter(
    (data: Vinyl, _encoding, cb) => {
      const snippetName = snippetGetName(data.path);
      const codeFile = snippetGetFile(snippetName);
      cb(data.path !== codeFile);
    },
    { objectMode: true, restore: true, passthrough: true }
  );

  return pipelinePart(
    filter,
    snippetPhpPreprocessor(),
    snippetCodePhpToSnippet(),
    filter.restore
  );
}

/** trim `<?php` from start of the file */
function snippetCodePhpToSnippet () {
  return new Stream.Transform({
    objectMode: true,
    transform (data, encoding, cb) {
      data.contents = Buffer.from(data.contents.toString('utf8').replace(/^<\?php\s*/u, ''));
      cb(null, data);
    },
  });
}
