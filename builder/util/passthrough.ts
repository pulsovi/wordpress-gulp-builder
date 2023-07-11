import Stream from 'stream';

export function passthrough () {
  return new Stream.Transform({
    objectMode: true,
    transform (data, _encoding, cb) {
      cb(null, data);
    },
  });
}
