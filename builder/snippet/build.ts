import Stream from 'stream';

import chalk from 'chalk';
import type Vinyl from 'vinyl';

import { streamToString } from '../util/streamToString.js';

import { snippetGetCode } from './getCode.js';
import { snippetGetDoc } from './getDoc.js';
import { snippetGetName } from './getName.js';
import { snippetGetScope } from './getScope.js';
import { snippetGetTitle } from './getTitle.js';
import { snippetGetVersion } from './getVersion.js';
import { snippetPublishVersion } from './publishVersion.js';
import { log } from '../util/log.js';
import { escapeRegExp } from '../util/regex.js';

/** Get snippet names and build them */
export function snippetBuild() {
  return new Stream.Transform({
    objectMode: true,
    async transform(data: Vinyl, _encoding, cb) {
      try {
        const snippetName = snippetGetName(data.path);

        if (
          process.argv.some(arg => arg.startsWith('--plugin') || arg.startsWith('--snippet'))
          && !process.argv.some(
            arg => new RegExp(`^--snippet=(['"]?)${escapeRegExp(snippetName)}\\1$`).test(arg)
          )
        ) {
          log(`filtered build not include "${snippetName}"`);
          cb(); return;
        }

        const code = await snippetGetCode(snippetName, false);
        const version = await snippetGetVersion({ code, isRequired: true });
        const doc = await snippetGetDoc(snippetName);
        const json = snippetBuildJSON({ code, doc, version, vinyl: data });
        cb(null, json);
      } catch (error) {
        console.log(chalk.blue(data.basename), chalk.red('Unable to build this snippet\nREASON :'), error.message);
        cb();
      }
    }
  });
}

interface SnippetBuildJsonOptions {
  code: string;
  doc: string;
  version: string;
  vinyl: Vinyl;
}

/** Compile snippet JSON form and return the corresponding Vinyl given it's root folder Vinyl */
function snippetBuildJSON({ code, doc, version, vinyl }: SnippetBuildJsonOptions): Vinyl {
  if (!code) throw new Error('Unable to build snippet without code');
  const date = new Date();
  const dateFormated = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  const codeFiltered = code.replace(/^<\?php\n?/u, '\n');
  const scope = snippetGetScope({ code, isRequired: true });

  const title = snippetGetTitle({ code, html: doc, isRequired: true });

  const snippet = {
    name: title,
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
  vinyl.path += '/' + vinyl.basename + '_' + version + '.code-snippets.json';
  vinyl.version = version;

  snippetPublishVersion({ title, version });
  return vinyl;
}
