import Stream from 'stream';

export interface TeeOptions {
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
 * Return a passthrough stream which writes all its data to the given stream
 *
 * @param stream The target second path stream (or pipeline part)
 * @param cloneOptions If `cloneOptions.clone` is true, all other properties
 *   of it will be followed to `File.clone` method
 */
export function tee (stream: NodeJS.WritableStream, cloneOptions: TeeOptions = {}): Stream.Transform {
  return new Stream.Transform({
    objectMode: true,
    transform (data, encoding, cb) {
      try {
        if (data && ('clone' in data) && (typeof data.clone === 'function')) {
          const { clone, ...options } = cloneOptions;
          const shadow = clone ? data.clone(options) : data;
          stream.write(shadow, encoding);
        }
        else stream.write(data, encoding);
      } catch (error) {
        cb(error);
        return;
      }
      cb(null, data);
    }
  })
}
