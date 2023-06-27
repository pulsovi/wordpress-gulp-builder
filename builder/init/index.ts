import { fs } from '../util/fs';

import { parallel } from 'gulp';

export const init = parallel(
  createTree,
);

async function createTree (cb) {
  await Promise.all([
    fs.ensureDir('src'),
    fs.ensureDir('vendor'),
  ]);
}
