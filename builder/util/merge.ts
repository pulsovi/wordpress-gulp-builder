import Stream from 'stream';

/**
 * Return a readable stream which pipe all given streams to its output
 *
 * @param middleStreams Stream or list of streams to merge on output
 */
export function merge (middleStreams: NodeJS.ReadWriteStream | NodeJS.ReadWriteStream[]) {
  const mergeStream = new Stream.Transform({
    objectMode: true,
    transform (data, encoding, cb) { this.push(data, encoding); cb(); },
  });

  const streams = Array.isArray(middleStreams) ? middleStreams : [middleStreams];

  streams.forEach(stream => { stream.pipe(mergeStream); });

  return mergeStream;
}
