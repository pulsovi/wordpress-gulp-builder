import path from 'path';

type PluginGetNameOptions = {
  /** The full path of a file for which the root path of the plugin that contains it must be found */
  filename: string;
}

export function pluginGetName (options: PluginGetNameOptions): string {
  if (path.relative('./src/plugins/', options.filename).startsWith('.')) {
    console.log('Unable to find a plugin name with these options.', options);
    throw new Error('Unable to find a plugin name with these options.');
  }

  const relative = path.relative('./src/plugins/', options.filename);
  const root = relative.slice(0, relative.indexOf(path.sep));
  return root;
}
