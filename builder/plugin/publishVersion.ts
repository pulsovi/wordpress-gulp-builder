import axios from 'axios';
import type Vinyl from 'vinyl';

import { getConfig } from '../util/config.js';
import { info } from '../util/log.js';

import { pluginGetTitle } from './getTitle.js';
import type { PluginGetTitleOptions } from './getTitle.js';
import { pluginGetVersion } from './getVersion.js';
import type { PluginGetVersionOptions } from './getVersion.js';
import { Transform } from 'stream';
import { pluginGetFile } from './getFile.js';
import { pluginGetName } from './getName.js';

type PluginPublishVersionOptions = PluginGetTitleOptions & PluginGetVersionOptions;

const versions: Record<string, string> = {};

/**
 * Return stream.Transform which input Vinyl file and
 * - passthrough all of them
 * - if the file is the plugin root file of a plugin, publish its version
 */
export function pluginVersionPublisher () {
  return new Transform({
    objectMode: true,
    async transform(data: Vinyl, _encoding, cb) {
      if (data.event && !['change', 'add'].includes(data.event)) return cb(null, data);
      const pluginName = pluginGetName({filename: data.path, throw: false});
      const pluginMainFile = pluginName ? pluginGetFile(pluginName) : null;
      if (!pluginMainFile || data.path !== pluginMainFile) return cb(null, data);
      const code = data.contents?.toString();
      await pluginPublishVersion({name: pluginName!, code});
      cb(null, data);
    },
  })
}

/**
 * publish given version as last version of given plugin
 */
export async function pluginPublishVersion (options: PluginPublishVersionOptions) {
  const {publish} = getConfig();
  if (!publish?.use) return;
  const url = `${publish.url}/${publish.auth}`;
  const title = await pluginGetTitle({ ...options, async: true });
  const version = await pluginGetVersion({ ...options, async: true });

  if (!title || !version) {
    info('cannot publish version for this plugin, title or version missing', { options, title, version });
    return;
  }

  if (versions[title] === version) return;
  versions[title] = version;

  return await axios({
    method: 'POST',
    data: { name: title, version },
    url
  }).then(result => {
    info('pluginPublishVersion', { title, version }, result.data);
    return result;
  }, error => {
    info('pluginPublishVersion ERROR', options, error.message);
    return null;
  });
}
