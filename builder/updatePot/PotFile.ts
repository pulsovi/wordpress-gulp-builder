import type Vinyl from 'vinyl';

interface PotFileData {
  chunks: Chunk[];
  strings: string[];
}

interface Chunk {
  comments: string[];
  msgid: string[];
  msgstr: string[];
}

export default class PotFile {
  public readonly source: Vinyl;
  public readonly data: PotFileData;

  constructor (source: Vinyl) {
    const content = source.contents?.toString();
    if (!content) throw new Error('Unable to get content of this pot file');
    this.source = source;
    this.data = PotFile.parse(content);
  }

  static parse (content: string): PotFileData {
    const chunks = content.split('\n\n').map(PotFile.parseChunk);
    const strings = chunks.map(PotFile.getMsgid);
    return { chunks, strings };
  }

  static parseChunk (this: void, rawChunk: string): Chunk {
    const lines = rawChunk.split('\n');
    const idIndex = lines.findIndex(line => line.startsWith('msgid'));
    const strIndex = lines.findIndex(line => line.startsWith('msgstr'));
    return {
      comments: lines.slice(0, idIndex),
      msgid: lines.slice(idIndex, strIndex),
      msgstr: lines.slice(strIndex),
    };
  }

  static getMsgid (this: void, chunk: Chunk): string {
    return chunk.msgid.join('\n').replace(/^msgid "|"\n"|"$/gu, '');
  }

  getStrings () {
    return this.data.strings.filter(str => Boolean(str));
  }

  addSourceFile (string: string, file: string, line: number): this {
    const index = this.data.strings.indexOf(string);
    if (index === -1)
      throw new Error(`Unable to find msgid "${string}" in potfile ${this.source.path}`);
    const chunk = this.data.chunks[index];

    const comment = `#: ${file.replace(/\\/gu, '/')}:${line}`;
    if (chunk && !chunk.comments.includes(comment)) chunk.comments.push(comment);
    return this;
  }

  toString () {
    return this.data.chunks.map(
      chunk => chunk.comments.concat(chunk.msgid, chunk.msgstr).join('\n')
    ).join('\n\n');
  }
}
