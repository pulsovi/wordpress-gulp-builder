import type Stream from 'stream';

/**
 * Pipe the given Streams each to the next one.
 * Also follows errors to the following streams.
 *
 * Unkike Stream.pipeline, this function returns the last stream of the pipe, not the result
 * It's very useful with batting streams such streamToString
 */
export function pipelineFollowError <T extends Stream.Writable>(stream: Stream, s1: Stream.Writable, s2: T): T;
export function pipelineFollowError (stream: Stream, ...streams: Stream.Writable[]): Stream;
export function pipelineFollowError (stream: Stream, ...streams: Stream.Writable[]): Stream {
  if (!streams.length) return stream;
  const [stream2, ...otherStreams] = streams;
  stream.pipe(stream2);
  stream.on('error', error => stream2.emit('error', error));
  return pipelineFollowError(stream2, ...otherStreams);
}
