import path from 'path';
import Stream from 'stream';

import type Vinyl from 'vinyl';

import { fs } from './fs.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const template = fs.readFile(path.resolve(__dirname, 'github-model.html'), 'utf8');

/**
 * Return Stream.Transform which transform html fragment file (Vinyl) to full
 * GitHub styled html5 document
 *
 * The title of the output document is the file name
 * The body of the output document is the file contents
 */
export function github () {
  // https://github.com/sindresorhus/github-markdown-css
  return new Stream.Transform({
    objectMode: true,
    async transform (data: Vinyl, _encoding, cb) {
      const title = data.stem;
      const body = data.contents?.toString();
      if (body) {
        const html = (await template).replace('<<<title>>>', title).replace('<<<body>>>', body);
        data.contents = Buffer.from(html);
      }
      cb(null, data);
    }
  });
}
