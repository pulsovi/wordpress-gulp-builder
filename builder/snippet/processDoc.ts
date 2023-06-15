import Stream from 'stream';

import markdown from 'gulp-markdown';
import type Vinyl from 'vinyl';
import StreamFilter from 'streamfilter'

import { pipelinePart } from '../util/pipelinePart';
import { stop } from '../util/todo';

import { snippetGetName } from './getName';
import { snippetGetVersion } from './getVersion';

/** Return a stream which take README.md file and return the formatted HTML for snippet */
export function snippetProcessDoc (): Stream.Duplex {
  const filter = new StreamFilter((data: Vinyl, _encoding, cb) => {
    cb(data.basename !== 'README.md');
  }, { objectMode: true, restore: true, passthrough: true });
  return pipelinePart(
    filter,
    markdown(),
    snippetDocFormat(),
    filter.restore,
  );
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
        const version = await snippetGetVersion({ name: snippetName });
        // const filtered = doc.replace(//ug, '🔗');
        data.contents = Buffer.from(`<div><p style="display: inline-block; margin: 0">Version ${version}</p><details style="display: inline-block; margin-left:1em;"><summary><h1>Documentation</h1></summary>${data.contents!.toString()}</details></div>`);
        cb(null, data);
      } catch (error) {
        stop();
        console.info('SNIPPET DOC FORMAT ERROR', error.message);
        cb(error);
      }
    },
  });
}
