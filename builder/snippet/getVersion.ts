import { fs } from '../util/fs';

import { snippetGetFiles } from './getFile';

type SyncOrPromise<T> = T | Promise<T>;
export type SnippetGetVersionOptions = {
  /**
   * return can be a Promise, if true `name` is required
   * @default false
   */
  async?: boolean;

  /**
   * return is required (cannot be null)
   * @default false
   */
  isRequired?: boolean;
  name?: string | null | undefined;
  html?: string | null | undefined;
  code?: string | null | undefined;
  version?: string | null | undefined;
} & ({

  /** snippet directory name, the snippet slug name */
  name: string;
} | {

  /** the html documentation of the snippet */
  html: string;
} | {

  /** the code of the snippet */
  code: string;
} | {

  /** version of the snippet, if present, it will be returned as is */
  version: string;
});

/** Get the snippet version from snippet code */
export function snippetGetVersion (options: SnippetGetVersionOptions & { isRequired: true }): SyncOrPromise<string>;
export function snippetGetVersion (options: SnippetGetVersionOptions & { async?: false }): string | null;
export function snippetGetVersion (options: SnippetGetVersionOptions): SyncOrPromise<string | null>;
export function snippetGetVersion (options: SnippetGetVersionOptions): SyncOrPromise<string | null> {
  const syncValue = (
    getFromVersion(options) ??
    getFromCode(options) ??
    getFromHtml(options)
  );

  if (syncValue) return syncValue;
  const { async, name, isRequired } = options;
  if (async && name) return getAsync({ ...options, name });
  if (!isRequired) return null;
  throw new Error(`Cannot get snippet version with these options : ${JSON.stringify(options)}`);
}

function getFromVersion (options: SnippetGetVersionOptions): string | null {
  if ('version' in options && options.version) return options.version;
  return null;
}

function getFromCode (options: SnippetGetVersionOptions): string | null {
  if (!('code' in options) || !options.code) return null;
  const code = options.code;
  const versionRE = /^ \* Version:\s*(?<version>\S*)$/um;
  const match = code.match(versionRE);
  if (match?.groups?.version) return match.groups.version;
  return null;
}

function getFromHtml (options: SnippetGetVersionOptions): string | null {
  if (!('html' in options) || !options.html) return null;
  const html = options.html;
  const versionRE = />Version (?<version>[\d\.]*) </u;
  const match = html.match(versionRE);
  if (match?.groups?.version) return match.groups.version;
  return null;
}

async function getAsync (options: SnippetGetVersionOptions & { name: string }): Promise<string | null> {
  const files = snippetGetFiles(options.name);
  let code = '';
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8').catch(() => '');
    if (!content) continue;
    code = content;
    break;
  }
  return getFromCode({ ...options, code, async: false });
}
