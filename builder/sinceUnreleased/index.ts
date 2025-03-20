import gulp from "gulp";
import { pluginListAll } from "../plugin/listAll.js";
import { snippetListAll } from "../snippet/listAll.js";
import { Stream } from "stream";
import type Vinyl from "vinyl";
import Snippet from "../snippet/Snippet.js";
import Plugin from "../plugin/Plugin.js";

const { dest, src } = gulp;

export async function sinceUnreleased (cb) {
  const plugins = await pluginListAll();
  const snippets = await snippetListAll();
  const items = getItems({plugins, snippets});
  await Promise.all(items.map(async item => {
    const version = await item.getVersion();
    const directory = item.getDir();
    const stream = src([`${directory}/**`, '!vendor/**', '!node_modules/**', '!coverage/**'], { base: '.' })
    .pipe(mapSinceUnreleased(version))
    .pipe(dest('.'));
    await new Promise((rs, rj) => {
      stream.on('end', rs);
      stream.on('error', rj);
    });
  })).catch(error => cb(error));
  cb();
}

function getItems ({plugins, snippets}: { plugins: Plugin[], snippets: Snippet[] }): (Plugin|Snippet)[] {
  const pluginName = process.argv.find(arg => arg.startsWith('--plugin'))?.split('=').pop();
  const plugin = plugins.find(item => item.name === pluginName)
  if (plugin) return [plugin];

  const snippetName = process.argv.find(arg => arg.startsWith('--snippet'))?.split('=').pop();
  const snippet = snippets.find(item => item.name === snippetName)
  if (snippet) return [snippet];

  return [...plugins, ...snippets];
}

function mapSinceUnreleased (version: string) {
  return new Stream.Transform({
    objectMode: true,
    transform (file: Vinyl, _encoding, cb) {
      const content = file.contents?.toString();
      if (!content) return cb(null, file);
      file.contents = Buffer.from(content.replace(/@unreleased/gu, `@since ${version}`));
      this.push(file);
      cb();
    }
  });
}
