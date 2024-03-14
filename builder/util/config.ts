import path from 'path';
import util from 'util';

import promptSync from 'prompt-sync';

import { prompt } from '../util/prompt.js';

import { fs } from './fs.js';

interface Config {
  server: {
    root: string;
  };
  publish?: {
    use: true;
    url: string;
    auth: string;
  } | { use: false };
}

let config: Config | null = null;
export function getConfig () {
  if (config) return config;
  try { config = JSON.parse(fs.readFileSync('.wpbuilderrc.json', 'utf8')); }
  catch (error) { createConfig(); }
  return config!;
}

export function createConfig () {
  promptConfig(
    'Please indicate the local folder which contains the WordPress installation : ',
    'server.root',
    {
      sanitize: value => value.replace(/^('|")(.*)\1$/u, '$2'),
      validate: value => {
        if (fs.existsSync(path.join(value, 'wp-config.php'))) return true;
        console.log(`unable to find the file "${path.resolve(value, 'wp-config.php')}". Make sure that the indicated folder contains a WordPress installation`);
        return false;
      }
    }
  );

  const using = promptConfig<boolean>(
    'Use an instance of wp_version_server? (y/n): ',
    'publish.use',
    {
      sanitize: value => ({ 'y': true, 'Y': true, 'n': false, 'N': false}[value]),
      validate: value => 'boolean' === typeof value,
    }
  );

  if (using) {
    promptConfig(
      'Please indicate the URL of your wp_version_server instance : ',
      'publish.url',
      { validate: value => (/https?:\/\/\w+.\w+/).test(value) }
    );

    promptConfig('Please indicate the AuthKey of your wp_version_server instance : ', 'publish.auth');
  }
}

export function promptConfig <T extends unknown = string>(message: string, prop: string | string[], { validate, sanitize }: {
  validate?: (val: any) => boolean;
  sanitize?: (val: string) => any;
} = {}): T {
  const exists = getConfigKey<T>(prop);
  if (exists !== null && ('function' !== typeof validate || validate(exists))) return exists;

  let value;
  let valid = true;

  do {
    value = promptSync()(message);
    if ('function' === typeof sanitize) value = sanitize(value);
    if ('function' === typeof validate) valid = validate(value);
  } while (!valid);

  config = set<Config>(config ?? {}, prop, value);
  fs.writeFileSync('.wpbuilderrc.json', JSON.stringify(config, null, 2), 'utf8');
  return value;
}

export function getConfigKey <T extends unknown = string>(prop: string | string[], defaultValue: T): T;
export function getConfigKey <T extends unknown = string>(prop: string | string[], defaultValue?: T): T | null {
  let value = get<T>(config, prop);
  if (value === null) try {
    value = get<T>(JSON.parse(fs.readFileSync('.wpbuilderrc.json', 'utf8')), prop);
  } catch (_error) { /* do nothing */ }
  if (value === null) try {
    // @ts-ignore
    value = get<T>(JSON.parse(fs.readFileSync(path.resolve(process.env.USERPROFILE, '.wpbuilderrc.json'), 'utf8')), prop);
  } catch (_error) { /* do nothing */ }
  if ('undefined' !== typeof defaultValue && value === null) return defaultValue;
  return value;
}

function set <T extends object>(root: Partial<T>, prop: string | string[], value): T {
  let parent = root;
  if (!Array.isArray(prop)) prop = prop.split('.');
  const key = prop.pop()!;
  prop.forEach(keyPart => { parent = (parent[keyPart] = parent[keyPart] ?? {}); });
  parent[key] = value;
  return root as T;
}

function get<T extends unknown>(root, prop: string | string[]): T | null {
  if (!Array.isArray(prop)) prop = prop.split('.');
  const key = prop.pop()!;
  let parent = root;
  for (const pathPart of prop) {
    if ('object' !== typeof parent || !parent) return null;
    parent = parent[pathPart];
  }
  if (!(key in parent)) return null;
  return parent[key] as T;
}

