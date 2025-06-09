import npath from 'node:path';

import fs, { type Stats } from 'fs-extra';

import { pluginGetFile } from './getFile.js';

interface PluginsIgnoreFilterOptions {
  base?: string;
  fileExcludeExts?: string[];
}

const filters: Record<string, ReturnType<typeof pluginIgnoreFilter>> = {};
export function pluginsIgnoreFilter (options: PluginsIgnoreFilterOptions = {}) {
  return (file: string, stats?: Stats): boolean => {
    if (stats?.isFile() && options.fileExcludeExts?.some(ext => file.endsWith(ext))) return true;
    const parts = options.base ?
      npath.relative(options.base, file).split(npath.sep) :
      file.split('/');
    const pluginName = parts.shift();
    if (!pluginName) return false;
    const filter = filters[pluginName] ?? (filters[pluginName] = pluginIgnoreFilter(pluginName));
    const result = filter(parts.join('/'), stats);
    return result;
  }
}

export function pluginIgnoreFilter (pluginName: string) {
  const dependencies = getDeps(pluginName);

  if (!fs.existsSync(pluginGetFile(pluginName))) return () => true;

  return (file: string, stats?: Stats): boolean => {
    // normalize path
    let path = file.replace(/\\/gu, '/').replace(`${pluginName}/`, '');

    // exclude node_modules & coverage
    if (/^(node_modules|coverage|tests)/u.test(path)) return true;

    // process vendor folder
    if (path.startsWith('vendor')) {
      // all dependencies are dev deps
      if (!dependencies.length) return true;

      path = path.replace(/^vendor\/?/u, '');
      if (path.startsWith('composer')) return false;
      if (!stats || !path.includes('/')) return false;
      if (stats.isDirectory())
        return !dependencies.some(item => path.startsWith(item) || item.startsWith(path));
      const directory = path.split('/').slice(0,-1).join('/');
      return !!directory && !dependencies.some(item => directory.startsWith(item));
    }
    return false;
  };
}

function getDeps (pluginName: string): string[] {
  const composerFile = npath.resolve('src/plugins', pluginName, 'composer.lock');
  try {
    const json = fs.readJsonSync(composerFile);
    return json.packages.map((pkg: {name: string}) => pkg.name);
  } catch (_error) {
    return [];
  }
}
