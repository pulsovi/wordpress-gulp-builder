import Stream from 'stream';

import chalk from 'chalk';
import type Vinyl from 'vinyl';

import { streamToString } from '../util/streamToString';

import { snippetGetName } from './getName';
import { snippetGetCode } from './getCode';
import { snippetGetTitle } from './getTitle';
import { snippetGetVersion } from './getVersion';
import { snippetGetDoc } from './getDoc';

/** Get snippet names and build them */
export function snippetBuild () {
  return new Stream.Transform({
    objectMode: true,
    async transform (data: Vinyl, _encoding, cb) {
      try {
        const snippetName = snippetGetName(data.path);
        const code = await snippetGetCode(snippetName, false);
        const version = await snippetGetVersion({ code });
        const doc = await snippetGetDoc(snippetName).pipe(streamToString());
        const json = snippetBuildJSON({ code, doc, version, vinyl: data });
        cb(null, json);
      } catch (error) {
        console.log(chalk.blue(data.basename), chalk.red('Unable to build this snippet\nREASON :'), error.message);
        cb();
      }
    }
  });
}

/** Compile snippet JSON form and return the corresponding Vinyl given it's root folder Vinyl */
function snippetBuildJSON({
  code, doc, version, vinyl, scope = 'global'
}: {
  code: string; doc: string; version: string; vinyl: Vinyl; scope?: 'global'
}): Vinyl {
  if (!code) throw new Error('Unable to build snippet without code');
  const date = new Date();
  const dateFormated = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  const codeFiltered = code.replace(/^<\?php\n?/u, '\n');

  const snippet = {
    name: snippetGetTitle({ code, html: doc, isRequired: true }),
    scope,
    code: codeFiltered,
    desc: doc,
    priority: '10',
  };
  const data = {
    generator: 'Code Snippets v3.3.0',
    date_created: dateFormated,
    snippets: [snippet],
  };

  const jsonString = JSON.stringify(data, null, 2).replace(/\//gu, '\\/');
  vinyl.contents = Buffer.from(jsonString, 'utf8');
  vinyl.path += '/' + vinyl.basename + '_' + version + '.code-snippets.json'
  return vinyl;
}
