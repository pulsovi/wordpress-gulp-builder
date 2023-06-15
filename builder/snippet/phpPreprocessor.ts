import path from 'path';
import Stream from 'stream';

import chalk from 'chalk';
import type Vinyl from 'vinyl';

import fs from 'fs-extra';

const commands: Record<string, ((match: RegExpMatchArray, data: Vinyl) => Promise<string>)> = {};
const preprocessPhpRE = /\/\*<<<(?<command>[a-z_]*)(?: (?<arguments>[^>]*))?>>>\*\//u;
const preprocessHtmlRE = /<!--<<<(?<command>[a-z_]*)(?: (?<arguments>[^>]*))?>>>-->/u;

/** return match of `content` against preprocess regexps */
function getMatch (content: string): RegExpMatchArray | null {
  return (
    content.match(preprocessPhpRE) ??
    content.match(preprocessHtmlRE)
  );
}

/**
 * Return a stream which consumes snippet PHP files and preprocess
 * all the `/*<<<command ...>>>*​/` strings
 */
export function snippetPhpPreprocessor () {
  return new Stream.Transform({
    objectMode: true,
    async transform (data: Vinyl, _encoding, cb) {
      console.log('snippetPhpPreprocessor', data.basename);
      _snippetPhpPreprocessor(data).then(
        () => {
          console.log('snippetPhpPreprocessor END', data.basename);
          cb(null, data);
        },
        error => {
          console.info(chalk.red('SNIPPET PHP PREPROCESSOR ERROR'), 'when process', chalk.blue(data.path), '\n', error.message);
          cb();
        }
      );
    },
  });
}
snippetPhpPreprocessor.func = _snippetPhpPreprocessor;

async function _snippetPhpPreprocessor (data: Vinyl): Promise<void> {
  let content = data.contents!.toString();
  let match = getMatch(content);

  while (match) {
    const { command } = match.groups!;

    if (command in commands) {
      const replacement = await commands[command](match, data);
      while (content.includes(match[0])) content = content.replace(match[0], replacement);
    }
    else throw new Error(`snippetPhpPreprocessor Error : Unknown preprocessor command ${command}`);

    match = getMatch(content);
  }

  data.contents = Buffer.from(content);
}

async function includeRaw (match: RegExpMatchArray, data: Vinyl): Promise<string> {
  const target = path.resolve(path.dirname(data.path), match.groups!.arguments);
  return await fs.readFile(target, 'utf8');
}
commands.include_raw = includeRaw;
