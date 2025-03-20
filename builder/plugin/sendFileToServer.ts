
import gulp from 'gulp'; const { dest } = gulp;
import pumpify from 'pumpify';

import { getConfig } from '../util/config';
import { unlinkDest } from '../util';
import { pluginProcessDoc } from './processDoc';
import { pluginProcessCode } from './processCode';
import { pluginVersionPublisher } from './publishVersion';

/**
 * Return stream.Duplex which input Vinyl file from project and copy them to the server FS
 */
export function pluginsSendFileToServer () {
  return pumpify(
    pluginProcessDoc(),
    pluginProcessCode(),
    pluginVersionPublisher(),
    unlinkDest('.', { cwd: `${getConfig().server.root}/wp-content/plugins` }),
    dest('.', { cwd: `${getConfig().server.root}/wp-content/plugins`, overwrite: true }),
  );
}
