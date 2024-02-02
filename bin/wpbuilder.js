import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { getConfig } from '../dist/builder/util/config.js';

getConfig();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.argv.splice(2, 0, '--cwd', path.resolve(process.cwd()), '-f', path.resolve(__dirname, '../dist/gulpfile.js'));

import('gulp-cli').then(({default: run}) => run());
