import type { TaskFunctionCallback } from 'gulp';
import watch from 'gulp-watch';

import { log } from '../util/log';
import { snippetProcessCode } from '../snippet/processCode';
import { snippetProcessDoc } from '../snippet/processDoc';
import { snippetHotUpdate } from '../snippet/hotUpdate';

/** Watch on snippets dir and update the server version of the snippet on each change */
export function snippetsSync (cb: TaskFunctionCallback) {
  return watch(`src/snippets/*/*`, { ignoreInitial: false })
    .pipe(log())
    .pipe(snippetProcessDoc())
    .pipe(snippetProcessCode({ follow: true }))
    .pipe(snippetHotUpdate());
}
