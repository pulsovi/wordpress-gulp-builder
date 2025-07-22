import Stream from 'stream';

import lead from 'lead';

/**
 * Return a stream.Transform which perform action on data and pass the data to the next stream

 * @param {(data: any) => void|Promise<void>} action Callback who get the data and perform synchronous action
 */
export function doAction <T>(action: (data: T) => void|Promise<void>) {
  return lead(new Stream.Transform({
    objectMode: true,
    async transform (data, _encoding, cb) {
      try {
        await action(data);
      } catch (error) {
        cb(error);
        return;
      }
      cb(null, data);
    }
  }));
}
