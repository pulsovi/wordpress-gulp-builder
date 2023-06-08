/** list of background services "close" functions */
const callbacks: (() => void)[] = [];

/** Add a callback to the on "idle" detector */
export function onIdle (cb: () => void): void {
  callbacks.push(cb);
}
onIdle.start = onIdleStart;

/** on "idle" detector */
function onIdleStart (cb) {
  const to = setInterval(() => {
    try {
      if ((process as any)._getActiveRequests().length) return;
      callbacks.forEach(cb => { cb(); });
      clearInterval(to);
      cb();
    } catch (error) {
      console.error(error);
    }
  }, 200);
}
