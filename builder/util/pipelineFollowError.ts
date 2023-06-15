import type Stream from 'stream';

/**
 * Pipe the given Streams each to the next one.
 * Also follows errors to the following streams.
 *
 * Unkike Stream.pipeline, this function returns the last stream of the pipe, not the result
 * It's very useful with batting streams such streamToString
 */
export function pipelineFollowError <T extends NodeJS.WritableStream>(stream: NodeJS.ReadableStream, s2: T): T;
export function pipelineFollowError <T extends NodeJS.WritableStream>(stream: NodeJS.ReadableStream, s1: NodeJS.ReadWriteStream, s2: T): T;
export function pipelineFollowError (stream: NodeJS.ReadableStream, ...streams: NodeJS.ReadWriteStream[]): NodeJS.WritableStream;
export function pipelineFollowError <T>(stream: T): T;
export function pipelineFollowError (stream: NodeJS.ReadableStream, ...streams: NodeJS.ReadWriteStream[]): NodeJS.ReadableStream | NodeJS.WritableStream {
  if (!streams.length) return stream;
  const [stream2, ...otherStreams] = streams;
  stream.pipe(stream2);
  stream.on('error', error => stream2.emit('error', error));
  return pipelineFollowError(stream2, ...otherStreams);
}
