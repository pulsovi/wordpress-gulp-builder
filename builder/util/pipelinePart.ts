import Stream from 'stream';

import { follow } from './follow';
import { stop } from './todo';

/**
 * Get a list of streams, pipe each to the following one and return new Stream
 * wich can be used as input / output of the pipeline
 */
export function pipelinePart (input: Stream.Readable, ...streams: NodeJS.ReadWriteStream[]): Stream.Duplex;
export function pipelinePart (input: Stream.Readable, ...streams: Stream.Duplex[]): Stream.Duplex;
export function pipelinePart (input: Stream.Duplex, ...streams: Stream.Duplex[]): Stream.Duplex;
export function pipelinePart (input: Stream.Duplex, ...streams: Stream.Duplex[]): Stream.Duplex {
  if (!streams.length) return input;

  const face = new Stream.Transform({
    objectMode: true,
    transform (data, encoding, cb) {
      try {
        input.write(data, encoding, cb);
      } catch (error) {
        stop();
        cb(error);
      }
    },
  });

  const output = new Stream.Duplex({
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

  let current: Stream = input;
  streams.forEach((stream, id) => {
    if (typeof stream.write !== 'function') stop();
    current.pipe(stream);
    current.on('error', error => { stream.emit('error', error); });
    current = stream;
  });
  current.pipe(output);

  face.end = (...args) => {
    input.end(...args);
    return face;
  };

  output.end = (...args) => {
    Reflect.apply(Object.getPrototypeOf(face).end, face, args);
    return output;
  };

  return face;
}
