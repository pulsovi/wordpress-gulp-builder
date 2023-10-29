import path from 'path';

import { prompt } from '../util/prompt';

import { fs } from './fs';

let initConfig: { server: { root: string; }} | null = null;
try {
  initConfig =
    JSON.parse(fs.readFileSync('.wpbuilderrc.json', 'utf8'));
} catch (error) {
  while (!initConfig) {
    const wordpressFolder = require('prompt-sync')()('Please indicate the local folder which contains the WordPress installation');
    if (fs.existsSync(path.join(wordpressFolder, 'wp-config.php'))) {
      initConfig = { server: { root: path.resolve(wordpressFolder) }};
      fs.writeFileSync('.wpbuilderrc.json', JSON.stringify(initConfig, null, 2), 'utf8');
    } else {
      console.log(`unable to find the file ${path.resolve(wordpressFolder, 'wp-config.php')}. Make sure that the indicated folder contains a WordPress installation`);
    }
  }
}

export const config = initConfig!;
