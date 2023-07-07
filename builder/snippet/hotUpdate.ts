import Stream from 'stream';

import chalk from 'chalk';
import type Vinyl from 'vinyl';

import { getConnectionOptions, query } from '../util/database';

import { snippetGetFiles, snippetGetDocFile } from './getFile';
import { snippetGetId } from './getId';
import { snippetGetName } from './getName';
import { snippetGetTitle } from './getTitle';
import { snippetPublishVersion } from './publishVersion';

export function snippetHotUpdate () {
  return new Stream.Writable({
    objectMode: true,
    async write (data: Vinyl, _encoding, cb) {
      try {
        // Verify data is one of code or doc files
        const snippetName = snippetGetName(data.path);
        const snippetFiles = [
          ...snippetGetFiles(snippetName),
          snippetGetDocFile(snippetName).replace(/.md$/u, '.html'),
        ];
        if (!snippetFiles.includes(data.path)) return cb();

        // Unknown event
        if (!['add', 'change'].includes(data.event)) {
          console.info(chalk.yellow('SNIPPET HOT UPDATE unmanaged event'), data.event, 'on', chalk.blue(data.path));
          return cb();
        }

        // Get snippet Title for logs and id for query
        const snippetTitle = await snippetGetTitle({ name: snippetName, async: true }) ?? snippetName;
        const snippetId = await snippetGetId(snippetName).catch<null>(error => null);

        // snippet not installed on the server
        if (!snippetId) {
          console.info('snippet with title', chalk.blue(snippetTitle), 'not found on the server, no hot update available');
          return cb();
        }

        // perform query
        const db = await getConnectionOptions();
        const column = data.stem === snippetName ? 'code' : 'description';
        const value = data.contents!.toString();

        await query(
          `UPDATE \`${db.prefix}snippets\` SET \`${column}\` = ? WHERE \`id\` = ?`,
          [value, snippetId]
        );

        // success
        console.info(chalk.green('HOT UPDATED'), chalk.blue(snippetTitle), column);
        snippetPublishVersion({ name: snippetName, title: snippetTitle, [column === 'code' ? 'code' : 'html']: value })

        cb();
      } catch (error) {
        console.info(chalk.red('SNIPPET HOT RELOAD ERROR'));
        cb(error);
      }
    }
  });
}
