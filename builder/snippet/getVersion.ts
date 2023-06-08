import fs from 'fs-extra';

import { snippetGetFile } from './getFile';

/** Get the snippet version from snippet code */
export async function snippetGetVersion (snippetName: string): Promise<string> {
  const versionRE = /^ \* Version:\s*(?<version>\S*)$/um;
  const file = snippetGetFile(snippetName);
  const code = await fs.readFile(file, 'utf8');
  const match = code.match(versionRE);
  if (match) return match.groups.version;
  throw new Error(`Unable to find version from this snippet ${file}`);
}
