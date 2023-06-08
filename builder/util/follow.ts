import Stream from 'stream';

/**
 * Return new Stream.Transform which follows the data to Readable interface of
 * dest or itself
 *
 * With `dest` provided, the data is followed to _output_ of `dest`
 * Without `dest`, the data is followed from input to output of the created stream
 */
export function follow (dest?: Stream.Readable) {
  return new Stream.Transform({
    objectMode: true,
    transform (data, encoding, cb) {
      if (dest) dest.push(data, encoding);
      else this.push(data);
      cb();
    }
  });
}
