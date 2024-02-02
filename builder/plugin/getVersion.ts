import { fs } from '../util/fs.js';

import { pluginGetFile } from './getFile.js';

type SyncOrPromise<T> = T | Promise<T>;
export type PluginGetVersionOptions = {
  /**
   * return can be a Promise. if true, `name` is required
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

  /** the code of the plugin */
  code: string;
} | {

  /** version of the plugin, if present, it will be returned as is */
  version: string;
});

/** Get the plugin version from plugin code */
export function pluginGetVersion (options: PluginGetVersionOptions & { async?: false, isRequired: true }): string;
export function pluginGetVersion (options: PluginGetVersionOptions & { isRequired: true }): SyncOrPromise<string>;
export function pluginGetVersion (options: PluginGetVersionOptions & { async?: false }): string | null;
export function pluginGetVersion (options: PluginGetVersionOptions): SyncOrPromise<string | null>;
export function pluginGetVersion (options: PluginGetVersionOptions): SyncOrPromise<string | null> {
  const syncValue = (
    getFromVersion(options) ??
    getFromCode(options)
  );

  if (syncValue) return syncValue;
  if (options.async && 'name' in options) return getAsync(options);
  if (!options.isRequired) return null;
  throw new Error(`Cannot get plugin version with these options : ${JSON.stringify(options)}`);
}

function getFromVersion (options: PluginGetVersionOptions): string | null {
  if ('version' in options && options.version) return options.version;
  return null;
}

function getFromCode (options: PluginGetVersionOptions): string | null {
  if (!('code' in options) || !options.code) return null;
  const code = options.code;
  const versionRE = /^ \* Version:\s*(?<version>\S*)$/um;
  const match = code.match(versionRE);
  if (match?.groups?.version) return match.groups.version;
  return null;
}

async function getAsync (options: PluginGetVersionOptions & { name: string }): Promise<string | null> {
  const file = pluginGetFile(options.name);
  const code = await fs.readFile(file, 'utf8');
  return getFromCode({ ...options, code, async: false });
}
