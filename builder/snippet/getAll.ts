import { snippetGetCode } from './getCode.js';
import { snippetGetDoc } from './getDoc.js';
import { snippetGetId } from './getId.js';
import { snippetGetScope } from './getScope.js';
import { snippetGetTitle } from './getTitle.js';
import { snippetGetVersion } from './getVersion.js';

/** Get all the properties of a snippet from its name */
export async function snippetGetAll (name: string) {
  const title = await snippetGetTitle({ name, async: true }) ?? name;
  const id = await snippetGetId(name).catch<null>(error => null);
  const code = await snippetGetCode(name, false);
  const description = await snippetGetDoc(name);
  const version = await snippetGetVersion({ code });
  const scope = snippetGetScope({ code });
  const tags = '';

  return { id, name, title, code, scope, description, version, tags };
}
