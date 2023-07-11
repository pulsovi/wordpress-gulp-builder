import markdown from 'gulp-markdown';
import rename from 'gulp-rename';
import StreamFilter from 'streamfilter'
import type Vinyl from 'vinyl';

import { bridge } from '../util/bridge';
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
    bridge(pipelinePart(
      github(),
      rename(path => { path.basename += '-full' }),
    ), { clone: true, contents: false }),
    markdownFilter.restore,
  );
}
