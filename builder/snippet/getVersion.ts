import { fs } from '../util/fs';

import { snippetGetFile } from './getFile';

/** Get the snippet version from snippet code */
export async function snippetGetVersion (options: { name: string } | { code: string }): Promise<string> {
  if (!(options as any).name && !(options as any).code) throw new Error('invalid parameters');
  const versionRE = /^ \* Version:\s*(?<version>\S*)$/um;

  let code = '';
  if ('code' in options) code = options.code;
  else {
    const file = snippetGetFile(options.name);
    code = await fs.readFile(file, 'utf8');
  }

  if ('string' === typeof code) {
    const match = code.match(versionRE);
    if (match?.groups?.version) return match.groups.version;
  }

  throw new Error(`Unable to find version from this snippet ${JSON.stringify(options)}`);
}
