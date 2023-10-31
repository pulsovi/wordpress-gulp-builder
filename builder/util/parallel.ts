import Stream from 'stream';

import { stop } from './todo';

import { TeeOptions } from './tee';

/**
 * Return a duplex stream which send all it's data to all the given streams
 * and follows output of these streams to its own output
 *
 * @param middleStreams One or a list of streams (or pipelines parts)
 * @param cloneOptions If `cloneOptions.clone` is true, all other properties
 *   of it will be followed to `File.clone` method
 * @param end Determine when the output stream will end.
 *   'all': when all middle streams are end
 *   'one': as soon as one of the middle flows is end
 *   'none': never
 *   number: when `end` stream are end
 *   default : 'all'
 */
export function parallel (
  middleStreams: NodeJS.ReadWriteStream | NodeJS.ReadWriteStream[],
  cloneOptions: TeeOptions = {},
  end: 'all' | 'one' | 'none' | number = 'all'
): Stream.Duplex {
  let endCount = 0;
  const streams = Array.isArray(middleStreams) ? middleStreams : [middleStreams];

  const face = new Stream.Transform({
    objectMode: true,
    transform (data, encoding, cb) {
      try {
        streams.forEach(stream => {
          if (cloneOptions.clone && isObject(data) && (typeof data.clone === 'function')) {
            const { clone, ...options } = cloneOptions;
            const shadow = data.clone(options);
            stream.write(shadow, encoding);
          } else {
            stream.write(data, encoding);
          }
        });
        cb();
      } catch (error) {
        cb(error);
      }
    },
  });

  const output = new Stream.Writable({
    objectMode: true,
    write (data, encoding, cb) {
      try {
        face.push(data, encoding);
        cb();
      } catch (error) {
        stop();
        cb(error);
      }
    }
  });

  for (const stream of streams) {
    stream.on('error', error => { face.emit('error', error); });
    stream.once('end', triggerEnd);
    stream.pipe(output);
  }

  return face;

  function triggerEnd () {
    endCount += 1;
    if (
      ('one' === end) ||
      (typeof end === 'number' && endCount >= end) ||
      ('all' === end && endCount === streams.length)
    ) {
      face.end();
    }
  }
}

function isObject (val: unknown): val is Record<PropertyKey, unknown> {
  return Boolean(val && typeof val === 'object');
}
