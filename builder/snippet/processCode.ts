import Stream from 'stream';

import StreamFilter from 'streamfilter';
import type Vinyl from 'vinyl';

import { pipelinePart } from '../util/pipelinePart';

import { snippetGetFile } from './getFile';
import { snippetGetName } from './getName';
import { snippetPhpPreprocessor } from './phpPreprocessor';
import type { Context } from './phpPreprocessor';

/** Return a Stream.Transform which process snippet code file */
export function snippetProcessCode (context?: Context): Stream.Duplex {
  const filter = new StreamFilter(
    (data: Vinyl, _encoding, cb) => {
      const snippetName = snippetGetName(data.path);
      const phpCodeFile = snippetGetFile(snippetName);
      const htmlCodeFile = snippetGetFile(snippetName, 'html');
      cb(![phpCodeFile, htmlCodeFile].includes(data.path));
    },
    { objectMode: true, restore: true, passthrough: true }
  );

  return pipelinePart(
    filter,
    snippetPhpPreprocessor(context),
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
