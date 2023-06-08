import fsExtra from 'fs-extra';

/** Add error stack to fs async errors */
export const fs: typeof fsExtra = (() => {
  const retval: Partial<typeof fsExtra> = {};
  Object.entries(fsExtra).forEach(([name, func]: [string, any]) => {
    if (typeof func !== 'function') {
      retval[name] = func;
      return;
    }
    retval[name as any] = function (...args) {
      let { stack } = new Error('');
      try {
        const result = Reflect.apply(func, this, args);
        if (!(result instanceof Promise)) return result;

        return result.catch(error => Promise.reject(packError(stack, error)));
      } catch (error) {
        // Unable to create new Error here, the call stack is already broken
        return Promise.reject(packError(stack, error));
      }
    }
  }, {});
  return retval as typeof fsExtra;
})();

function packError (stack: string, error: Error): Error {
  error.stack = error.message + stack.slice(stack.indexOf('\n'));
  return error;
}
