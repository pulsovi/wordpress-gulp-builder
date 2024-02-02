import { inspect } from 'util';

import { sleepSync } from './time.js';

const debugMode = process.env.NODE_ENV !== 'prod';

/**
 * Indicates a point in the code that remains to be completed, print stack, and stop process
 *
 * @param message any useful information to complete the missing piece of code.
 *   what is passed to this parameter will be printed on standard output before printing the
 *   stack and stopping the process
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function todo (message?: unknown, ..._args: unknown[]): any {
  const errStr = typeof message === 'string' ? message : "Cette route n'est pas encore construite.";
  const error = new Error(errStr);

  if (debugMode) {
    stop();
    console.info(message, '\n', error);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }

  throw error;
}

/** allows a greater display depth of the "message" parameter */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
todo.depth = function depth (deep: number, message: unknown, ..._args: unknown[]): any {
  return todo(inspect(message, true, deep, true));
};

const logCache: string[] = [];

/** Indicates a point in the code that remains to be completed without triggering an error */
// eslint-disable-next-line func-name-matching
todo.log = function todoLog (message?: unknown, ..._args: unknown[]): void {
  if (!debugMode) return;

  const text = typeof message === 'string' ? message : "There's a job to complete";
  if (logCache.includes(text)) return;
  logCache.push(text);

  const error = new Error(text);
  const { stack } = error;

  if (!stack) {
    return;
  }

  const stackArr = stack.split('\n');
  stackArr.splice(1, 1);
  const logMessage = stackArr.join('\n').replace(/^Error/u, 'TODO');
};

/**
 * Equivalent to the `debugger;` statement
 *
 * except that this function checks if a debugger can be attached to the process and waits
 * for this attachment before calling the `debugger;` statement.
 *
 * Otherwise, the statement would simply be ignored.
 */
export function stop (_requestedReturn?: string): unknown {
  if (process.env.NODE_ENV === 'prod') return null;
  if (!process.execArgv.some(arg => arg.startsWith('--inspect'))) {
    console.info('\nthe `stop()` function was called, but no debugger can be attached to this script because it was not launched with the `--inspect` option');
    return null;
  }
  let debbuggerStarted = false;
  let before = Date.now();
  // allow `debugger` to return value at end of stop() function
  // eslint-disable-next-line prefer-const
  let returnValue = null;

  // allow `debugger` to trigger an error from this call stack position
  // eslint-disable-next-line prefer-const
  let errorMessage = null;

  // first call before printing "wait for debugger"
  // eslint-disable-next-line no-debugger
  debugger;

  /*
   * if the previous line took at least 50 milliseconds to execute, it is likely that a debugger
   * caught it.
   */
  debbuggerStarted = (Date.now() - before) > 50;
  if (!debbuggerStarted) console.info('wait for debbugger start');

  while (!debbuggerStarted) {
    before = Date.now();
    // eslint-disable-next-line no-debugger
    debugger;
    debbuggerStarted = (Date.now() - before) > 50;
    if (!debbuggerStarted) sleepSync(200);
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (errorMessage) throw new Error(errorMessage);
  return returnValue;
}
