import path from 'path';

import { fs } from '../util/fs';
import { config } from '../util/config';

/** Delete from server all plugins managed here */
export async function pluginsCleanServerFiles (cb) {
  const knownPlugins = await fs.readdir('src/plugins', { withFileTypes: true });
  const installedPlugins = await fs.readdir(path.join(config.server.root, 'wp-content/plugins'));
  await Promise.all(knownPlugins
    .filter(dirent => dirent.isDirectory() && installedPlugins.includes(dirent.name))
    .map(dirent => fs.rm(
      path.join(config.server.root, 'wp-content/plugins', dirent.name),
      { force: true, recursive: true }
    ))
  );
}
pluginsCleanServerFiles.displayName = 'pluginsCleanServerFiles';
