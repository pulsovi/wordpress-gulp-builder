import { getConnectionOptions, query } from '../util/database';

import { snippetGetTitle } from './getTitle';

/** Get snippet name and return the ID of this snippet on the server */
export async function snippetGetId (snippetName: string): Promise<number | null> {
  const db = await getConnectionOptions();
  const snippetTitle = await snippetGetTitle({ name: snippetName, async: true, isRequired: true });
  const [response] = await query(
    `SELECT \`id\` FROM \`${db.prefix}snippets\` WHERE \`name\` = ? LIMIT 1;`,
    [snippetTitle]
  );

  // snippet not installed on the server
  if (!Array.isArray(response) || !response.length || !('id' in response[0])) return null;
  return response[0].id;
}
