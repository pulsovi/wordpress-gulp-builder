import Vinyl from 'vinyl';

import { streamToString } from './streamToString';

type SyncOrPromise<T> = T | PromiseLike<T>;

export function vinylToString (data: Vinyl): SyncOrPromise<string> {
  const { contents } = data;
  if (!contents) return '';
  if (contents instanceof Buffer) return contents.toString();
  return contents.pipe(streamToString());
}
