import path from 'path';
import util from 'util';

import promptSync from 'prompt-sync';

import { prompt } from '../util/prompt.js';

import { fs } from './fs.js';

let config: { server: { root: string; }} | null = null;
export function getConfig () {
  if (config) return config;
  try { config = JSON.parse(fs.readFileSync('.wpbuilderrc.json', 'utf8')); }
  catch (error) {
    while (!config) {
      let wordpressFolder = promptSync()('Please indicate the local folder which contains the WordPress installation : ');
      wordpressFolder = wordpressFolder.replace(/^('|")(.*)\1$/u, '$2');
      if (fs.existsSync(path.join(wordpressFolder, 'wp-config.php'))) {
        config = { server: { root: path.resolve(wordpressFolder) }};
        fs.writeFileSync('.wpbuilderrc.json', JSON.stringify(config, null, 2), 'utf8');
      } else {
        console.log(`unable to find the file "${path.resolve(wordpressFolder, 'wp-config.php')}". Make sure that the indicated folder contains a WordPress installation`);
      }
    }
  }
  return config!;
}
