import { fs } from '../util/fs';

/** Return version of the given plugin by name */
export async function pluginGetVersion (pluginName): Promise<string> {
  const pluginFile = `src/plugins/${pluginName}/${pluginName}.php`;
  const content = await fs.readFile(pluginFile, 'utf8');
  const versionRE = /^ \* Version:\s*(?<version>\S*)$/um;
  const match = content.match(versionRE);

  if (!match) throw new Error(`Unable to find version of this plugin : ${pluginName}`);
  return match.groups!.version;
}
