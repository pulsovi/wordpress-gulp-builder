import { snippetGetCode } from './getCode';
import { snippetGetDoc } from './getDoc';
import { snippetGetId } from './getId';
import { snippetGetScope } from './getScope';
import { snippetGetTitle } from './getTitle';
import { snippetGetVersion } from './getVersion';

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
