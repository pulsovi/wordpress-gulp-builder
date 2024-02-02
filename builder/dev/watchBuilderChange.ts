import gulp from 'gulp'; const { watch } = gulp;

import { onIdle } from '../util/onIdle.js';

export function watchBuilderChange (cb) {
  const watcher = watch(['./gulpfile.ts', './.wpbuilderrc.json', './builder/**/*']);

  watcher.on('all', (event, filename) => {
    console.info('File event :', event, filename);
    process.exit(0);
  });

  onIdle(() => {
    watcher.close();
    cb();
  });
}
