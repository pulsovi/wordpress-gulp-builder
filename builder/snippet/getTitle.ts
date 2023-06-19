import chalk from 'chalk';
import fs from 'fs-extra';

import type { SyncOrPromise } from '../util';

import { snippetGetDocFile, snippetGetFile } from './getFile';

interface GetTitleOptions {
  /**
   * return can be a Promise, if true `name` is required
   * @default false
   */
  async?: boolean;

  /** snippet name */
  name?: string;

  /**
   * return is required (cannot be null)
   * @default false
   */
  isRequired?: boolean;
  code?: string;
  html?: string;
  markdown?: string;
}

/** retrieve snippet title from its code, html, or dirname */
export function snippetGetTitle (options: GetTitleOptions): SyncOrPromise<string | null>;
export function snippetGetTitle (options: GetTitleOptions): SyncOrPromise<string | null> {
  const syncValue = (
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

function getFromCode (options: GetTitleOptions): string | null {
  if (!options.code) return null;
  return (
    options.code
    .match(/^ \* (?:Snippet|Plugin) Name: (?<snippetName>.*)$/mu)
    ?.groups!.snippetName ?? null
  );
}

function getFromHtml (options: GetTitleOptions): string | null {
  if (!options.html) return null;
  return (
    options.html
    .match(/<h1[^>]*>(?<title>.*?)<\/h1>/u)
    ?.groups!.title ?? null
  );
}

function getFromMd (options: GetTitleOptions): string | null {
  if (!options.markdown) return null;
  return (
    options.markdown
    .match(/^# (?<title>.*)\n/u)
    ?.groups!.title ?? null
  );
}

async function getAsyncFromCode (options: GetTitleOptions & { name: string }): Promise<string> {
  let codeFile = snippetGetFile(options.name);
  if (!await fs.exists(codeFile)) codeFile = snippetGetFile(options.name, 'html');
  const code = await fs.readFile(codeFile, 'utf8');
  const title = getFromCode({ code });
  if (title) return title;
  throw new Error('Cannot get title from this code');
}

async function getAsyncFromMd (options: GetTitleOptions & { name: string }): Promise<string> {
  const mdFile = snippetGetDocFile(options.name);
  const markdown = await fs.readFile(mdFile, 'utf8');
  const title = getFromMd({ markdown });
  if (title) return title;
  throw new Error('Cannot get title from this doc');
}
