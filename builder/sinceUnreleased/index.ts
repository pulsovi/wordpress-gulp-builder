import gulp from "gulp";
import { pluginListAll } from "../plugin/listAll.js";
import { snippetListAll } from "../snippet/listAll.js";
import { Stream } from "stream";
import type Vinyl from "vinyl";

const { dest, src } = gulp;

export async function sinceUnreleased (cb, ...args) {
  console.log('sinceUnreleased', {
    args,
    pargs: process.argv,
  });
  const plugins = await pluginListAll();
  const snippets = await snippetListAll();
  const items = [...plugins, ...snippets];
  await Promise.all(items.map(async item => {
    const version = await item.getVersion();
    const directory = item.getDir();
    const stream = src(`${directory}/**`)
    .pipe(mapSinceUnreleased(version))
    .pipe(dest('.'));
    await new Promise((rs, rj) => {
      stream.on('end', rs);
      stream.on('error', rj);
    });
  })).catch(error => cb(error));
  cb();
}

function mapSinceUnreleased (version: string) {
  return new Stream.Transform({
    objectMode: true,
    transform (file: Vinyl, _encoding, cb) {
      const content = file.contents?.toString();
      if (!content) return cb(null, file);
      file.contents = Buffer.from(content.replace(/\b@unreleased\b/gu, `@since ${version}`));
      this.push(file);
      cb();
    }
  });
}
