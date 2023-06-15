import StreamFilter from 'streamfilter';
import type Vinyl from 'vinyl';

/**
 * Return a restorable stream filter
 *
 * @param paradigm A callback function which take a data Vinyl and return
 *   boolean or Promise<boolean> indicate if this Vinyl must be KEPT.
 */
export function filter (paradigm: (data: Vinyl) => boolean) {
  return new StreamFilter(
    async (data: Vinyl, _encoding, cb) => cb(await paradigm(data)),
    { objectMode: true, restore: true, passthrough: true }
  );
}
