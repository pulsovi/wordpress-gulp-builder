import Stream from 'stream';

import markdown from 'gulp-markdown';
import type Vinyl from 'vinyl';
import StreamFilter from 'streamfilter'

import { pipelinePart } from '../util/pipelinePart.js';
import { getConfig } from '../util/config.js';
import { stop } from '../util/todo.js';
import { vinylToString } from '../util/vinylToString.js';

import { snippetGetName } from './getName.js';
import { snippetGetVersion } from './getVersion.js';
import { snippetGetTitle } from './getTitle.js';

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
        const version = await snippetGetVersion({ name: snippetName, async: true });
        const html = await vinylToString(data);
        const title = await snippetGetTitle({ name: snippetName, isRequired: true, async: true, html });
        const config = getConfig();
        const versionServer = config.publish?.use ? config.publish.url : false;
        const versionLogo = versionServer ? `<img src="${versionServer}/check?name=${encodeURIComponent(title)}&amp;version=${version}" style="vertical-align: bottom;width: 1.3em;">` : '';
        // const filtered = doc.replace(//ug, '🔗');
        data.contents = Buffer.from(`<div><p style="display: inline-block; margin: 0">Version ${version} ${versionLogo}</p><details style="display: inline-block; margin-left:1em;"><summary><h1 style="display: inline-block;">Documentation</h1></summary>${html}</details></div>`);
        cb(null, data);
      } catch (error) {
        stop();
        console.info('SNIPPET DOC FORMAT ERROR', error.message);
        cb(error);
      }
    },
  });
}
