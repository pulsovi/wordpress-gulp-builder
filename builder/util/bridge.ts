import Stream from 'stream';

import { tee } from './tee';

import { TeeOptions } from './tee';

/**
 * Return a passthrough stream which tee all it's data to the given stream
 * AND
 * follows output of this given stream to its own output
 *
 * @param stream The target second path stream (or pipeline part)
 * @param cloneOptions If `cloneOptions.clone` is true, all other properties
 *   of it will be followed to `File.clone` method
 */
export function bridge (stream: NodeJS.ReadWriteStream, cloneOptions: TeeOptions = {}) {
  const bridgeStream = tee(stream, cloneOptions);

  // redirect all stream output to bridge output
  stream.pipe(new Stream.Writable({
    objectMode: true,
    write (data, _encoding, cb) {
      try {
        bridgeStream.push(data);
      } catch (error) {
        cb(error);
        return;
      }
      cb();
    }
  }));

  return bridgeStream;
}
