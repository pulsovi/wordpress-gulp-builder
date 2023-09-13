import Stream from 'stream';

import chalk from 'chalk';
import type Vinyl from 'vinyl';

import { getConnectionOptions, query } from '../util/database';
import { info } from '../util/log';

import { snippetGetCode } from './getCode';
import { snippetGetDoc } from './getDoc';
import { snippetGetFiles, snippetGetDocFile } from './getFile';
import { snippetGetId } from './getId';
import { snippetGetName } from './getName';
import { snippetGetScope } from './getScope';
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
          info(chalk.yellow('SNIPPET HOT UPDATE unmanaged event'), data.event, 'on', chalk.blue(data.path));
          return cb();
        }

        // Get snippet Title for logs and id for query
        const snippetTitle = await snippetGetTitle({ name: snippetName, async: true }) ?? snippetName;
        const snippetId = await snippetGetId(snippetName).catch<null>(error => null);

        // perform query
        const db = await getConnectionOptions();
        const column = data.stem === snippetName ? 'code' : 'description';
        const value = data.contents!.toString();

        if (snippetId) {
          // snippet found, update it
          await query(
            `UPDATE \`${db.prefix}snippets\` SET \`${column}\` = ? WHERE \`id\` = ?`,
            [value, snippetId]
          );
        } else {
          // snippet not installed on the server, install it
          info('snippet with title', chalk.blue(snippetTitle), 'not found on the server, installing it ...');
          const code = (column === 'code') ? value : await snippetGetCode(snippetName, false);
          const description = (column === 'description') ? value : await snippetGetDoc(snippetName);
          const scope = snippetGetScope({ code });
          await query(
            `INSERT INTO \`${db.prefix}snippets\`
              (name, code, description, scope, tags)
            VALUES
              (?, ?, ?, ?, ?)
            `,
            [snippetTitle, code, description, scope, '']
          )
        }

        // success
        info(chalk.green('HOT UPDATED'), chalk.blue(snippetTitle), column);
        snippetPublishVersion({ name: snippetName, title: snippetTitle, [column === 'code' ? 'code' : 'html']: value })

        cb();
      } catch (error) {
        info(chalk.red('SNIPPET HOT RELOAD ERROR'));
        cb(error);
      }
    }
  });
}
