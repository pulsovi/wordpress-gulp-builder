/** return a Promise which resolves in given ms */
export async function sleep (ms: number): Promise<void> {
  await new Promise(rs => { setTimeout(rs, ms); });
}

/** wait for some time (milliseconds) _synchronously_ */
export function sleepSynchronously(milliseconds: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

export const sleepSync = sleepSynchronously;
