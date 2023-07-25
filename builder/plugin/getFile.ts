import path from 'path';

/** Return the absolute path of the main file of the given plugin */
export function pluginGetFile (pluginName: string): string {
  return path.resolve('src/plugins', pluginName, `${pluginName}.php`);
}
