import Stream, { Readable, Writable } from 'stream';

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
  if (!isReadableStream(stream)) throw new Error('stream is not a readable stream');
  if (!isWritableStream(stream2)) throw new Error('stream2 is not a writable stream');
  if (isReadableObjectMode(stream) && !isWritableObjectMode(stream2))
    throw new Error('stream outputs Objects but stream2 does not accept them');
  stream.pipe(stream2);
  stream.on('error', error => stream2.emit('error', error));
  return pipelineFollowError(stream2, ...otherStreams);
}

function isReadableStream(stream: any): stream is Stream.Readable {
  return typeof stream.pipe === 'function' && stream instanceof Stream;
}

function isWritableStream(stream: any): stream is Stream.Writable {
  return typeof stream.write === 'function' && stream instanceof Stream;
}

function isReadableObjectMode(stream: Readable): stream is Readable & { readableObjectMode: true } {
  return stream.readableObjectMode || (stream as any)._readableState?.objectMode;
}

function isWritableObjectMode(stream: Writable): stream is Writable & { writableObjectMode: true } {
  return stream.writableObjectMode || (stream as any)._writableState?.objectMode;
}