import Stream from 'stream';

import Vinyl from 'vinyl';

/** Return a Stream.Duplex which filter vinyl through given callback */
export function vinylFilter (filter: (data: Vinyl) => boolean): Stream.Duplex {
  return new Stream.Transform({
    objectMode: true,
    transform (data: Vinyl, encoding, cb) {
      if (filter(data)) this.push(data);
      cb();
    },
  });
}
