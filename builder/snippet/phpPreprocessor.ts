import path from 'path';
import Stream from 'stream';

import chalk from 'chalk';
import type Vinyl from 'vinyl';

import fs from 'fs-extra';

const commands: Record<string, ((match: RegExpMatchArray, data: Vinyl) => Promise<string>)> = {};
const commandRE = [
  /\/\*<<<(?<command>[a-z_]*)(?: (?<arguments>[^>]*))?>>>\*\//u,
  /<!--<<<(?<command>[a-z_]*)(?: (?<arguments>[^>]*))?>>>-->/u,
  /('|")<<<(?<command>php_string) (?<arguments>[^>]*)>>>\1/u,

  /* ↓ this line MUST be the last item of the array ↓ */
  /<<<(?<command>php_string) (?<arguments>[^>]*)>>>/u,
]

/** return match of `content` against preprocess regexps */
function getMatch (content: string): RegExpMatchArray | null {
  for (const regexp of commandRE) {
    const match = content.match(regexp);
    if (match) return match;
  }
  return null;
}

/**
 * Return a stream which consumes snippet PHP files and preprocess
 * all the `/*<<<command ...>>>*​/` strings
 */
export function snippetPhpPreprocessor () {
  return new Stream.Transform({
    objectMode: true,
    async transform (data: Vinyl, _encoding, cb) {
      try {
        await _snippetPhpPreprocessor(data)
        cb(null, data);
      } catch (error) {
        console.info(chalk.red('SNIPPET PHP PREPROCESSOR ERROR'), 'when process', chalk.blue(data.path), '\n', error.message);
        cb(error);
      }
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

async function phpString (match: RegExpMatchArray, data: Vinyl): Promise<string> {
  const content = await includeRaw(match, data);
  const phpString = `'${content.replace(/\\/gu, '\\\\').replace(/'/gu, "\\'")}'`;
  return phpString;
}
commands.php_string = phpString;
