import gulp from 'gulp';
import pumpify from 'pumpify';
const { dest } = gulp;

import { changeType } from '../util/changeType.js';
import { getConfig } from '../util/config.js';
import { unlinkDest } from '../util/unlinkDest.js';

import { pluginProcessCode } from './processCode.js';
import { pluginProcessDoc } from './processDoc.js';
import { pluginVersionPublisher } from './publishVersion.js';

/**
 * Return stream.Duplex which input Vinyl file from project and copy them to the server FS
 */
export function pluginsSendFileToServer () {
  const cwd = `${getConfig().server.root}/wp-content/plugins`;
  return pumpify.obj(
    pluginProcessDoc(),
    pluginProcessCode(),
    pluginVersionPublisher(),
    unlinkDest('.', { cwd }),
    changeType('.', cwd),
    dest('.', { cwd, overwrite: true }),
  );
}