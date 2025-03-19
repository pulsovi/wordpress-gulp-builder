import npath from 'node:path';

import fs, { type Stats } from 'fs-extra';

export function vendorIgnoreFilter (pluginName) {
  const deps = getDeps(pluginName);

  return async (file: string, stats?: Stats): Promise<boolean> => {
    if (file.includes('stripe')) {
      console.log('vendorIgnoreFilter', {file, deps: await deps, pluginName});
      console.log(new Error('stack'));
      process.exit();
    }
    // normalize path
    let path = file.replace(/\\/gu, '/').replace(`${pluginName}/`, '');

    // exclude node_modules & coverage
    if (/^(node_modules|coverage)/u.test(path)) return true;

    // process vendor folder
    if (path.startsWith('vendor')) {
      const dependencies = await deps;

      // all dependencies are dev deps
      if (!dependencies.length) return true;

      path = path.replace(/^vendor\/?/u, '');
      if (!stats || !path.includes('/')) return false;
      if (stats.isDirectory())
        return !dependencies.some(item => path.startsWith(item) || item.startsWith(path));
      const directory = path.split('/').slice(0,-1).join('/');
      return !!directory && !dependencies.some(item => directory.startsWith(item));
    }
    return false;
  };
}

async function getDeps (pluginName) {
  const composerFile = npath.resolve('src/plugins', pluginName, 'composer.lock');
  try {
    const json = await fs.readJson(composerFile);
    return json.packages.map(pkg => pkg.name);
  } catch (_error) {
    return [];
  }
}
