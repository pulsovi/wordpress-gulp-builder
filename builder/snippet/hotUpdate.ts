import Stream from 'stream';

import chalk from 'chalk';
import type Vinyl from 'vinyl';

import { getConnectionOptions, query } from '../util/database';

import { snippetGetFile, snippetGetDocFile } from './getFile';
import { snippetGetId } from './getId';
import { snippetGetName } from './getName';
import { snippetGetTitle } from './getTitle';

export function snippetHotUpdate () {
  return new Stream.Writable({
    objectMode: true,
    async write (data: Vinyl, _encoding, cb) {
      try {
        const snippetName = snippetGetName(data.path);
        const snippetFiles = [
          snippetGetFile(snippetName),
          snippetGetFile(snippetName, 'html'),
          snippetGetDocFile(snippetName).replace(/.md$/u, '.html'),
        ];
        if (!snippetFiles.includes(data.path)) return cb();
        if (!['add', 'change'].includes(data.event)) {
          console.info(chalk.yellow('SNIPPET HOT UPDATE unmanaged event'), data.event, 'on', chalk.blue(data.path));
          return cb();
        }

        const snippetTitle = await snippetGetTitle({ name: snippetName, async: true });
        const snippetId = await snippetGetId(snippetName).catch<null>(error => null);

        // snippet not installed on the server
        if (!snippetId) {
          console.info('snippet with title', chalk.blue(snippetTitle ?? snippetName), 'not found on the server, no hot update available');
          return cb();
        }

        const db = await getConnectionOptions();
        const column = data.stem === snippetName ? 'code' : 'description';

        await query(
          `UPDATE \`${db.prefix}snippets\` SET \`${column}\` = ? WHERE \`id\` = ?`,
          [data.contents!.toString(), snippetId]
        );
        console.info(chalk.green('HOT UPDATED'), chalk.blue(snippetTitle), column);

        cb();
      } catch (error) {
        console.info(chalk.red('SNIPPET HOT RELOAD ERROR'));
        cb(error);
      }
    }
  });
}
