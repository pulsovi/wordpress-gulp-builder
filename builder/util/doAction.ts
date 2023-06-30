import Stream from 'stream';

/**
 * @param {(Vinyl) => void} action Callback who get the vinyl data and perform synchronous action
 */
export function doAction (action) {
  return new Stream.Transform({
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
  });
}
