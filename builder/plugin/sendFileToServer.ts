
import gulp from 'gulp'; const { dest } = gulp;
import pumpify from 'pumpify';

import { getConfig } from '../util/config.js';
import { unlinkDest } from '../util/unlinkDest.js';

import { pluginProcessDoc } from './processDoc.js';
import { pluginProcessCode } from './processCode.js';
import { pluginVersionPublisher } from './publishVersion.js';

/**
 * Return stream.Duplex which input Vinyl file from project and copy them to the server FS
 */
export function pluginsSendFileToServer () {
  return pumpify.obj(
    pluginProcessDoc(),
    pluginProcessCode(),
    pluginVersionPublisher(),
    unlinkDest('.', { cwd: `${getConfig().server.root}/wp-content/plugins` }),
    dest('.', { cwd: `${getConfig().server.root}/wp-content/plugins`, overwrite: true }),
  );
}
