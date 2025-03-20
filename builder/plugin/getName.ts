import path from 'path';

type PluginGetNameOptions = {
  /** The full path of a file for which the root path of the plugin that contains it must be found */
  filename: string;

  /**
   * if throw is false, wrong filename return null. throw an Error otherwise.
   *
   * @default true
   */
  throw?: boolean;
}

export function pluginGetName (options: PluginGetNameOptions & { throw?: true }): string;
export function pluginGetName (options: PluginGetNameOptions & { throw: false }): string|null;
export function pluginGetName (options: PluginGetNameOptions): string|null {
  if (path.relative('./src/plugins/', options.filename).startsWith('.')) {
    if (options.throw === false) return null;
    console.log('Unable to find a plugin name with these options.', options);
    throw new Error('Unable to find a plugin name with these options.');
  }

  const relative = path.relative('./src/plugins/', options.filename);
  const root = relative.slice(0, relative.indexOf(path.sep));
  return root;
}
