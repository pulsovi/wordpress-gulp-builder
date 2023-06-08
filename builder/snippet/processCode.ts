import Stream from 'stream';

import markdown from 'gulp-markdown';
import type Vinyl from 'vinyl';

import { follow } from '../util';

import { snippetGetFile } from './getFile';
import { snippetGetName } from './getName';
import { snippetGetVersion } from './getVersion';
import { snippetPhpPreprocessor } from './phpPreprocessor';

/** Return a Stream.Transform which process snippet code file */
export function snippetProcessCode (): Stream.Transform {
  const processor = follow();
  const stream = new Stream.Transform({
    objectMode: true,
    transform (data: Vinyl, _encoding, cb) {
      const snippetName = snippetGetName(data.path);
      const codeFile = snippetGetFile(snippetName);

      if (data.path === codeFile) processor.push(data);
      else this.push(data);
      cb();
    }
  });

  processor
    .pipe(snippetPhpPreprocessor())
    .pipe(snippetCodePhpToSnippet())
    .pipe(follow(stream));

  return stream;
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
