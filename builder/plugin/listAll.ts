import path from "path";
import { fs } from "../util/fs.js";
import Plugin from "./Plugin.js";

export async function pluginListAll () {
  const pluginDir = './src/plugins';
  const dirents = await fs.readdir(pluginDir, { withFileTypes: true });
  const plugins = await Promise.all(dirents.map(async dirent => {
    if (!dirent.isDirectory()) return null;
    if (!await fs.exists(path.join(pluginDir, dirent.name, `${dirent.name}.php`))) return null;
    return new Plugin(dirent.name);
  }));
  return plugins.filter((item): item is Plugin => Boolean(item));
}
