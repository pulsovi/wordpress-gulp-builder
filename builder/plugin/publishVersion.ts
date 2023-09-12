import axios from 'axios';

import { info } from '../util/log';

import { pluginGetTitle } from './getTitle';
import type { PluginGetTitleOptions } from './getTitle';
import { pluginGetVersion } from './getVersion';
import type { PluginGetVersionOptions } from './getVersion';

type PluginPublishVersionOptions = PluginGetTitleOptions & PluginGetVersionOptions;

const versions: Record<string, string> = {};

/** publish given version as last version of given plugin */
export async function pluginPublishVersion (options: PluginPublishVersionOptions) {
  const title = await pluginGetTitle(options);
  const version = await pluginGetVersion(options);

  if (!title || !version) {
    info('cannot publish version for this plugin, title or version missing', { options, title, version });
    return;
  }

  if (versions[title] === version) return;
  versions[title] = version;

  return await axios({
    method: 'POST',
    data: { name: title, version },
    url: 'http://wp-snippet.marchev.fr/s3HR2pEMg4p4'
  }).then(result => {
    info('pluginPublishVersion', { title, version }, result.data);
    return result;
  }, error => {
    info('pluginPublishVersion ERROR', options, error.message);
    return null;
  });
}
