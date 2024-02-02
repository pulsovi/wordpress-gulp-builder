import markdown from 'gulp-markdown';
import rename from 'gulp-rename';
import StreamFilter from 'streamfilter'
import type Vinyl from 'vinyl';

import { github } from '../util/github.js';
import { htmlWithBase } from '../util/htmlWithBase.js';
import { parallel } from '../util/parallel.js';
import { passthrough } from '../util/passthrough.js';
import { pipelinePart } from '../util/pipelinePart.js';

/** Return a stream which take *.md files and return the formatted HTML for plugin */
export function pluginProcessDoc () {
  const markdownFilter = new StreamFilter(
    (data: Vinyl, encoding, cb) => { cb(data.extname !== '.md'); },
    // https://www.npmjs.com/package/streamfilter#streamfilterfiltercallback-options-%E2%87%92-stream
    { objectMode: true, restore: true, passthrough: true }
  );

  return pipelinePart(
    markdownFilter,
    pipelinePart(
      markdown({ gfm: true }),
      parallel([
        passthrough(),
        pipelinePart(
          github(),
          htmlWithBase(),
          rename(path => { path.basename += '-full' }),
        )
      ], { clone: true, contents: false }),
    ),
    markdownFilter.restore,
  );
}
