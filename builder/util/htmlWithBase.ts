import Stream from 'stream';

import type Vinyl from 'vinyl';

/**
 * Return a Stream.Transform which receive html files
 *
 * add the <base> element with GET param 'base' as href
 */
export function htmlWithBase () {
  return new Stream.Transform({
    objectMode: true,
    transform (data: Vinyl, _encoding, cb) {
      if (data.extname !== '.html') return cb(null, data);
      const contents = data.contents?.toString();
      if (!contents) throw new Error('Missing content');
      const phpContents = contents.replace('</head>', `<script>
        const base = document.createElement('base');
        base.href = location.search.slice(1)
          .split('&').map(item => item.split('='))
          .find(item => item[0] === 'base')?.[1] ?? '';
        base.href += '/';
        document.head.appendChild(base);
        base.target = '_blank';
      </script></head>`);
      data.contents = Buffer.from(phpContents);
      this.push(data, _encoding);
      cb();
    }
  });
}
