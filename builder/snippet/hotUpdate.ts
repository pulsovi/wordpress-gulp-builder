import Stream from 'stream';

import chalk from 'chalk';
import type Vinyl from 'vinyl';

import { getConnectionOptions, query } from '../util/database';
import { info } from '../util/log';

import { snippetGetAll } from './getAll';
import { snippetGetDocFile, snippetGetFiles } from './getFile';
import { snippetGetName } from './getName';
import { snippetPublishVersion } from './publishVersion';

export function snippetHotUpdate () {
  return new Stream.Writable({
    objectMode: true,
    async write (data: Vinyl, _encoding, cb) {
      try {
        const name = snippetGetName(data.path);

        // Verify data is one of code or doc files
        const snippetFiles = [
          ...snippetGetFiles(name),
          snippetGetDocFile(name).replace(/.md$/u, '.html'),
        ];
        if (!snippetFiles.includes(data.path)) {
          info(chalk.yellow('SNIPPET HOT UPDATE unmanaged file'), data.path);
          return cb();
        }

        // Unknown event
        if (!['add', 'change'].includes(data.event)) {
          info(chalk.yellow('SNIPPET HOT UPDATE unmanaged event'), data.event, 'on', chalk.blue(data.path));
          return cb();
        }

        // perform query
        const db = await getConnectionOptions();
        const { id, title, code, description, scope, tags, version } = await snippetGetAll(name);

        if (id) {
          // snippet found, update it
          await query(
            `UPDATE \`${db.prefix}snippets\` SET
              name = ?, code = ?, description = ?, scope = ?, tags = ?
            WHERE id = ?`,
            [title, code, description, scope, tags, id]
          );
        } else {
          // snippet not installed on the server, install it
          info('snippet with title', chalk.blue(title), 'not found on the server, installing it ...');
          await query(
            `INSERT INTO \`${db.prefix}snippets\`
              (name, code, description, scope, tags)
            VALUES
              (?, ?, ?, ?, ?)
            `,
            [title, code, description, scope, tags]
          )
        }

        // success
        info(chalk.green('HOT UPDATED'), chalk.blue(title));
        snippetPublishVersion({ name, title, version })

        cb();
      } catch (error) {
        info(chalk.red('SNIPPET HOT RELOAD ERROR'));
        cb(error);
      }
    }
  });
}
