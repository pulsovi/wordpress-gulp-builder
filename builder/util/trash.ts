import { Transform, Writable } from "node:stream";

/**
 * Return writable stream which does nothing.
 *
 * Its purpose is to clean out pipeline ending to avoid memory leakeage
 *
 * @unreleased
 */
export function trash () {
  return new Writable({
    objectMode: true,
    write (_chunk, _encoding, cb) { cb(); },
  });
}
