import axios from 'axios';

import { snippetGetTitle } from './getTitle';
import type { SnippetGetTitleOptions } from './getTitle';
import { snippetGetVersion } from './getVersion';
import type { SnippetGetVersionOptions } from './getVersion';

type SnippetPublishVersionOptions = SnippetGetTitleOptions & SnippetGetVersionOptions;

/** publish given version as last version of given snippet */
export function snippetPublishVersion (options: SnippetPublishVersionOptions) {
  const title = snippetGetTitle(options);
  const version = snippetGetVersion(options);

  if (!title || !version) {
    console.log('cannot publish version for this snippet, title of version missing', { options, title, version });
    return;
  }
  return axios({
    method: 'POST',
    data: { name: title, version },
    url: 'http://wp-snippet.marchev.fr/s3HR2pEMg4p4'
  }).then(result => {
    console.log('snippetPublishVersion', { title, version }, result.data);
    return result;
  }, error => {
    console.log('snippetPublishVersion ERROR', options, error);
    return null;
  });
}
