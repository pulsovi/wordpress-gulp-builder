import axios from 'axios';

import { info } from '../util/log.js';

import { snippetGetTitle } from './getTitle.js';
import type { SnippetGetTitleOptions } from './getTitle.js';
import { snippetGetVersion } from './getVersion.js';
import type { SnippetGetVersionOptions } from './getVersion.js';

type SnippetPublishVersionOptions = SnippetGetTitleOptions & SnippetGetVersionOptions;

const versions: Record<string, string> = {};

/** publish given version as last version of given snippet */
export async function snippetPublishVersion (options: SnippetPublishVersionOptions) {
  const title = await snippetGetTitle(options);
  const version = await snippetGetVersion(options);

  if (!title || !version) {
    info('cannot publish version for this snippet, title or version missing', { options, title, version });
    return;
  }

  if (versions[title] === version) return;
  versions[title] = version;

  return await axios({
    method: 'POST',
    data: { name: title, version },
    url: 'http://wp-snippet.marchev.fr/s3HR2pEMg4p4'
  }).then(result => {
    info('snippetPublishVersion', { title, version }, result.data);
    return result;
  }, error => {
    info('snippetPublishVersion ERROR', options, error.message);
    return null;
  });
}
