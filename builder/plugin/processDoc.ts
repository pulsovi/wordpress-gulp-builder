import markdown from 'gulp-markdown';
import StreamFilter from 'streamfilter'
import type Vinyl from 'vinyl';

import { github } from '../util/github';
import { pipelinePart } from '../util/pipelinePart';

/** Return a stream which take *.md files and return the formatted HTML for plugin */
export function pluginProcessDoc () {
  const markdownFilter = new StreamFilter(
    (data: Vinyl, encoding, cb) => { cb(data.extname !== '.md'); },
    { objectMode: true, restore: true, passthrough: true }
  );
  return pipelinePart(
    markdownFilter,
    markdown({ gfm: true }),
    github(),
    markdownFilter.restore,
  );
}
