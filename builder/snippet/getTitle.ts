import chalk from 'chalk';
import fs from 'fs-extra';

import { snippetGetDocFile, snippetGetFile } from './getFile.js';

type SyncOrPromise<T> = T | Promise<T>;

export type SnippetGetTitleOptions = {
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
} & ({
  /** snippet directory name, the snippet slug name */
  name: string;
} | {
  /** title of the snippet, if present, it will be returned as is */
  title: string;
} | {
  /** the code of the snippet */
  code: string;
} | {
  html: string;
} | {
  markdown: string;
});

/** retrieve snippet title from its code, html, or dirname */
export function snippetGetTitle (options: SnippetGetTitleOptions & { async?: false; isRequired: true }): string;
export function snippetGetTitle (options: SnippetGetTitleOptions & { async?: false }): string | null;
export function snippetGetTitle (options: SnippetGetTitleOptions & { isRequired: true }): SyncOrPromise<string>;
export function snippetGetTitle (options: SnippetGetTitleOptions): SyncOrPromise<string | null>;
export function snippetGetTitle (options: SnippetGetTitleOptions): SyncOrPromise<string | null> {
  const syncValue = (
    getFromTitle(options) ??
    getFromCode(options) ??
    getFromHtml(options) ??
    getFromMd(options)
  );

  if (syncValue) return syncValue;

  if (options.async) {
    if (!('name' in options)) throw new Error('options.name is required when options.async is true');
    const { name } = options;
    return getAsyncFromCode({ name })
      .catch(() => getAsyncFromMd({ name }))
      .catch(() => {
        if (!options.isRequired) return null;
        throw new Error(`Impossible de récuperer le titre du snippet ${chalk.blue(options.name)}, ni à partir du fichier de code, ni à partir du fichier markdown.\nPour rendre cette détection possible, ajouter un fichier "README.md" avec un titre de niveau 1, ou ajouter un [header](obsidian://open?vault=Vaults&file=David%20Gabison%2FArchive%2FPHP%20-%20WordPress%20-%20Snippets%20-%20En%20t%C3%AAte) au fichier de code`);
      });
  }

  if (!options.isRequired) return null;
  throw new Error(`Cannot get title for this snippet : ${JSON.stringify(options)}`);
}

function getFromTitle (options: SnippetGetTitleOptions): string | null {
  if ('title' in options && options.title) return options.title;
  return null;
}

function getFromCode (options: SnippetGetTitleOptions): string | null {
  if (!('code' in options) || !options.code) return null;
  return (
    options.code
    .match(/^ \* (?:Snippet|Plugin) Name: (?<snippetName>.*)$/mu)
    ?.groups!.snippetName ?? null
  );
}

function getFromHtml (options: SnippetGetTitleOptions): string | null {
  if (!('html' in options) || !options.html) return null;
  return (
    options.html
    .match(/<h1[^>]*>(?<title>.*?)<\/h1>/u)
    ?.groups!.title ?? null
  );
}

function getFromMd (options: SnippetGetTitleOptions): string | null {
  if (!('markdown' in options) || !options.markdown) return null;
  return (
    options.markdown
    .match(/^# (?<title>.*)\n/u)
    ?.groups!.title ?? null
  );
}

async function getAsyncFromCode (options: SnippetGetTitleOptions & { name: string }): Promise<string> {
  let codeFile = snippetGetFile(options.name);
  if (!await fs.exists(codeFile)) codeFile = snippetGetFile(options.name, 'html');
  const code = await fs.readFile(codeFile, 'utf8');
  const title = getFromCode({ code });
  if (title) return title;
  throw new Error('Cannot get title from this code');
}

async function getAsyncFromMd (options: SnippetGetTitleOptions & { name: string }): Promise<string> {
  const mdFile = snippetGetDocFile(options.name);
  const markdown = await fs.readFile(mdFile, 'utf8');
  const title = getFromMd({ markdown });
  if (title) return title;
  throw new Error('Cannot get title from this doc');
}
