import Vinyl from 'vinyl';

import { streamToString } from './streamToString.js';

type SyncOrPromise<T> = T | PromiseLike<T>;

export function vinylToString (data: Vinyl): SyncOrPromise<string> {
  const { contents } = data;
  if (!contents) return '.js';
  if (contents instanceof Buffer) return contents.toString();
  return contents.pipe(streamToString());
}
