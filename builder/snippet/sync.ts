import type { TaskFunctionCallback } from 'gulp';
import watch from 'gulp-watch';

import { log } from '../util/log.js';
import { snippetProcessCode } from '../snippet/processCode.js';
import { snippetProcessDoc } from '../snippet/processDoc.js';
import { snippetHotUpdate } from '../snippet/hotUpdate.js';

/** Watch on snippets dir and update the server version of the snippet on each change */
export function snippetsSync (cb: TaskFunctionCallback) {
  return watch(`src/snippets/*/*`, { ignoreInitial: false })
    .pipe(log())
    .pipe(snippetProcessDoc())
    .pipe(snippetProcessCode({ follow: true }))
    .pipe(snippetHotUpdate());
}
