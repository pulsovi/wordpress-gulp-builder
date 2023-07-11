import Stream from 'stream';

import { tee } from './tee';

interface BridgeOptions {
  /**
   * If data is a File, clone it before split. Cloning avoid modification collision by ref.
   * @default false
   */
  clone?: boolean;

  /**
   * If `file.contents` is a `Buffer` and `options.contents` is `false`, the `Buffer` reference
   * will be reused instead of copied.
   * @default true
   */
  contents?: boolean | undefined;

  /**
   * if `clone` or `options.deep` is `false`, custom attributes will not be cloned deeply.
   * @default true
   */
  deep?: boolean | undefined;
}

/**
 * Return a passthrough stream which tee all it's data to the given stream
 * AND
 * follows output of this given stream to its own output
 *
 * @param stream The target second path stream (or pipeline part)
 * @param cloneOptions If `cloneOptions.clone` is true, all other properties
 *   of it will be followed to `File.clone` method
 */
export function bridge (stream: NodeJS.ReadWriteStream, cloneOptions: BridgeOptions = {}) {
  const bridgeStream = tee(stream);
  const connector = new Stream.Writable({
    objectMode: true,
    write (data, _encoding, cb) {
      try {
        if (data && 'clone' in data && typeof data.clone === 'function') {
          const { clone, ...options } = cloneOptions;
          const shadow = clone ? data.clone(options) : data;
          bridgeStream.push(shadow);
        }
        else bridgeStream.push(data);
      } catch (error) {
        cb(error);
        return;
      }
      cb();
    }
  })
  stream.pipe(connector);
  return bridgeStream;
}
