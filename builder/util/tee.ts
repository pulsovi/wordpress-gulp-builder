import Stream from 'stream';

/** Return a passthrough stream which writes all its data to the given stream */
export function tee (stream: NodeJS.WritableStream): Stream.Transform {
  return new Stream.Transform({
    objectMode: true,
    transform (data, encoding, cb) {
      try {
        stream.write(data, encoding);
      } catch (error) {
        cb(error);
        return;
      }
      cb(null, data);
    }
  })
}
