import Stream from 'stream';

import markdown from 'gulp-markdown';
import type Vinyl from 'vinyl';

import { follow } from '../util';

import { snippetGetName } from './getName';
import { snippetGetVersion } from './getVersion';

/** Return a stream which take README.md file and return the formatted HTML for snippet */
export function snippetProcessDoc () {
  const process = follow();
  const stream = new Stream.Transform({
    objectMode: true,
    transform (data: Vinyl, _encoding, cb) {
      if (data.basename !== 'README.md') this.push(data);
      else process.push(data);
      cb();
    }
  });

  process
    .pipe(markdown())
    .pipe(snippetDocFormat())
    .pipe(follow(stream));

  return stream;
}

/**
 * Returns a stream which consumes snippet doc file and
 * transforms the html to snippet doc html string
 */
function snippetDocFormat () {
  return new Stream.Transform({
    objectMode: true,
    async transform (data: Vinyl, _encoding, cb) {
      try {
        const snippetName = snippetGetName(data.path);
        const version = await snippetGetVersion(snippetName);

        // const filtered = doc.replace(//ug, '🔗');
        data.contents = Buffer.from(`<div><p style="display: inline-block; margin: 0">Version ${version}</p><details style="display: inline-block; margin-left:1em;"><summary><h1>Documentation</h1></summary>${data.contents.toString()}</details></div>`);
        cb(null, data);
      } catch (error) {
        console.info('SNIPPET DOC FORMAT ERROR');
        cb(error);
      }
    },
  });
}
