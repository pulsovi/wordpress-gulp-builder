import { fs } from '../util/fs';

import { snippetGetFiles } from './getFile';

type SyncOrPromise<T> = T | Promise<T>;

/** Scope of the snippet */
const scopes = [
  /** normal php snippet */
  'global',

  /** html injectable using a shortcode */
  'content',

  /** php snippet which is disabled on admin back-office */
  'front-end',

  /** php snippet whic is enabled only on admin back-office */
  'admin',

  /** php snippet which is fired once you click on a "play" button in snippets list page */
  'single-use',
] as const;
type Scope = (typeof scopes)[number];

function isScope (value?: string): value is Scope {
  return (scopes as readonly string[]).includes(value!);
}

function assertIsScope (value: string): Scope | never {
  if (isScope(value)) return value;
  throw new Error(`Unknown scope type : ${value}`);
}

export type SnippetGetScopeOptions = {
  /**
   * return can be a Promise, if true `name` is required
   * @default false
   */
  async?: boolean;

  /**
   * return value is required (cannot be null)
   * @default false
   */
  isRequired?: boolean;
} & ({

  /** snippet directory name, the snippet slug name */
  name: string;
} | {

  /** the code of the snippet */
  code: string;
} | {

  /** scope of the snippet, if present, it will be returned as is */
  scope: Scope;
});

/** Get the snippet scope from snippet code */
export function snippetGetScope (options: SnippetGetScopeOptions & { async?: false, isRequired: true }): Scope | never;
export function snippetGetScope (options: SnippetGetScopeOptions & { async: true, isRequired: true }): SyncOrPromise<Scope | never>;
export function snippetGetScope (options: SnippetGetScopeOptions & { async?: false }): Scope | null;
export function snippetGetScope (options: SnippetGetScopeOptions): SyncOrPromise<Scope | null>;
export function snippetGetScope (options: SnippetGetScopeOptions): SyncOrPromise<Scope | null> {
  const syncValue = (
    getFromScope(options) ??
    getFromCode(options)
  );

  if (syncValue) return syncValue;
  if (options.async && 'name' in options) return getAsync(options);
  if (!options.isRequired) return null;
  throw new Error(`Cannot get snippet scope with these options : ${JSON.stringify(options)}`);
}

function getFromScope (options: SnippetGetScopeOptions): Scope | null {
  if ('scope' in options && options.scope) return assertIsScope(options.scope);
  return null;
}

function getFromCode (options: SnippetGetScopeOptions): Scope | null {
  if (!('code' in options) || !options.code) return null;
  const code = options.code;

  const scopeRE = /^ \* Scope:\s*(?<scope>[a-z-]*)$/um;
  const match = code.match(scopeRE);
  if (!match) return 'global';
  return assertIsScope(match.groups?.scope ?? 'regex error');
}

async function getAsync (options: SnippetGetScopeOptions & { name: string }): Promise<Scope | null> {
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


