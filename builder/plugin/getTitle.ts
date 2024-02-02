import chalk from 'chalk';
import fs from 'fs-extra';

import { pluginGetFile } from './getFile.js';

type SyncOrPromise<T> = T | Promise<T>;

export type PluginGetTitleOptions = {
  /**
   * return can be a Promise.
   * if true, `name` is required.
   * @default false
   */
  async?: boolean;

  /**
   * return is required (cannot be null)
   * @default false
   */
  isRequired?: boolean;
} & ({
  /** plugin directory name, the plugin slug name */
  name: string;
} | {
  /** title of the plugin, if present, it will be returned as is */
  title: string;
} | {
  /** the code of the plugin */
  code: string;
});

/** retrieve plugin title from its code, html, or dirname */
export function pluginGetTitle (options: PluginGetTitleOptions & { async?: false; isRequired: true }): string;
export function pluginGetTitle (options: PluginGetTitleOptions & { async?: false }): string | null;
export function pluginGetTitle (options: PluginGetTitleOptions & { isRequired: true }): SyncOrPromise<string>;
export function pluginGetTitle (options: PluginGetTitleOptions): SyncOrPromise<string | null>;
export function pluginGetTitle (options: PluginGetTitleOptions): SyncOrPromise<string | null> {
  const syncValue = (
    getFromTitle(options) ??
    getFromCode(options)
  );

  if (syncValue) return syncValue;

  if (options.async) {
    if (!('name' in options)) throw new Error('options.name is required when options.async is true');
    const { name } = options;
    return getAsyncFromCode({ name })
      .catch(() => {
        if (!options.isRequired) return null;
        throw new Error(`Impossible de récuperer le titre du plugin ${chalk.blue(options.name)}.`);
      });
  }

  if (!options.isRequired) return null;
  throw new Error(`Cannot get title for this plugin : ${JSON.stringify(options)}`);
}

function getFromTitle (options: PluginGetTitleOptions): string | null {
  if ('title' in options && options.title) return options.title;
  return null;
}

function getFromCode (options: PluginGetTitleOptions): string | null {
  if (!('code' in options) || !options.code) return null;
  return (
    options.code
    .match(/^ \* (?:Plugin|Plugin) Name: (?<pluginName>.*)$/mu)
    ?.groups!.pluginName ?? null
  );
}

async function getAsyncFromCode (options: PluginGetTitleOptions & { name: string }): Promise<string> {
  const codeFile = pluginGetFile(options.name);
  const code = await fs.readFile(codeFile, 'utf8');
  const title = getFromCode({ code });
  if (title) return title;
  throw new Error('Cannot get title from this code');
}
