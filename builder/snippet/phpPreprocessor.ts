import path from 'path';
import Stream from 'stream';

import chalk from 'chalk';
import fs from 'fs-extra';
import Vinyl from 'vinyl';

import { error, info } from 'fancy-log';

type CommandMatch = RegExpMatchArray & { groups: { command: string; arguments: string; }};
type Context = Record<string, unknown>;
const commands: Record<string, ((match: CommandMatch, data: Vinyl, context: Context) => Promise<string>)> = {};
const commandRE = [
  /\/\*<<<(?<command>[a-z_]*)(?: (?<arguments>[^>]*))?>>>\*\//u,
  /<!--<<<(?<command>[a-z_]*)(?: (?<arguments>[^>]*))?>>>-->/u,
  /('|")<<<(?<command>php_string) (?<arguments>[^>]*)>>>\1/u,
  /^# ?(?<command>[a-z_]*)(?: (?<arguments>.*))?$/mu,

  /* ↓ this line MUST be the last item of the array ↓ */
  /<<<(?<command>php_string) (?<arguments>[^>]*)>>>/u,
]

/** return match of `content` against preprocess regexps */
function getMatch (content: string): CommandMatch | null {
  for (const regexp of commandRE) {
    const match = content.match(regexp);
    if (match) return match as CommandMatch;
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

async function _snippetPhpPreprocessor (
  data: Vinyl, context: Context = {}
): Promise<void> {
  let content = data.contents!.toString();
  let match = getMatch(content);

  while (match) {
    const { command } = match.groups!;

    let replacement = '';
    if (command in commands) {
      replacement = await commands[command](match, data, context);
    } else {
      error(chalk.red(`snippetPhpPreprocessor Error : Unknown preprocessor command ${command}`));
    }
    while (content.includes(match[0])) content = content.replace(match[0], replacement);

    match = getMatch(content);
  }

  data.contents = Buffer.from(content);
}

commands.include_raw = async function includeRaw (match, data): Promise<string> {
  const target = path.resolve(path.dirname(data.path), match.groups.arguments);
  const content = await fs.readFile(target, 'utf8');
  return content;
};

commands.php_string = async function phpString (match, data): Promise<string> {
  const target = path.resolve(path.dirname(data.path), match.groups.arguments);
  const content = await fs.readFile(target, 'utf8');
  const phpString = `'${content.replace(/\\/gu, '\\\\').replace(/'/gu, "\\'")}'`;
  return phpString;
};

commands.include_once = async function includeOnce (match, data, context): Promise<string> {
  const target = path.resolve(path.dirname(data.path), match.groups.arguments);
  const included = context.includeOnce = context.includeOnce as string[] ?? [];
  if (included.includes(target)) {
    // console.log({match: match.groups, file: data.path, context, target});
    return '';
  }
  included.push(target);
  const stat = await fs.stat(target).catch(err => ({ error: err }));
  if ('error' in stat) {
    error(chalk.red(`Unable to include_once. ${stat.error}`));
    error('context:', data.path);
    // console.log({match: match.groups, file: data.path, context, target});
    return '';
  }
  const includeFile = new Vinyl({
    cwd: data.cwd,
    contents: (await fs.readFile(target)).slice('<?php'.length),
    stat,
    base: data.base,
    path: target,
  });
  await _snippetPhpPreprocessor(includeFile, context);
  // console.log({match: match.groups, file: data.path, context, target}, includeFile.contents.toString());
  return includeFile.contents.toString();
};
