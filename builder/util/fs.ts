import fsExtra from 'fs-extra';

/** Add error stack to fs async errors */
export const fs = (() =>
  Object.entries(fsExtra).reduce((fsDebug, [name, func]) => {
    if (typeof func !== 'function' || name.endsWith('Sync')) {
      fsDebug[name] = func;
    } else {
      fsDebug[name] = function (...args) {
        let stack = new Error('').stack ?? '';
        try {
          const result = Reflect.apply(func, this, args);
          if (!(result instanceof Promise)) return result;

          return result.catch(error => Promise.reject(packError(stack, error)));
        } catch (error) {
          // There would be no point in creating `new Error` here. The call stack is already broken.
          console.info('FS_DEBUG ERROR', { error, args });
          return Promise.reject(packError(stack, error));
        }
      }
    }
    return fsDebug;
  }, Object.assign({}, fsExtra))
)();

function packError (stack: string, error: Error): Error {
  error.stack = error.message + stack.slice(stack.indexOf('\n'));
  return error;
}
