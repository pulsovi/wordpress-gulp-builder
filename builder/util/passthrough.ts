import Stream from 'stream';

/** Return simple passthrough Stream */
export function passthrough () {
  return new Stream.Transform({
    objectMode: true,
    transform (data, encoding, cb) {
      this.push(data, encoding)
      cb();
    },
  });
}
