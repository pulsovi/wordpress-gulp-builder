import * as npath from 'node:path';
import { Readable } from 'node:stream';

import type { ChokidarOptions, Matcher } from 'chokidar';
import fs, { type Stats } from 'fs-extra';
import { type Options as VinylOptions, vinylFile } from 'vinyl-file';

type Path = string;


type AsyncMatchFunction = (val: string, stats?: Stats) => Promise<boolean>;
export type FSWalkerOptions = Omit<ChokidarOptions, 'ignored'> & {
  base?: string;

  /**
   * If function, it returns true to ignore and false to keep a path
   */
  ignored?: Matcher | AsyncMatchFunction | (Matcher | AsyncMatchFunction)[]
};

type FSWlkrOptions = FSWalkerOptions & {
  ignored: (Matcher | AsyncMatchFunction)[];
};

/**
 * Instantiates walker with paths to be tracked.
 * @param paths file / directory paths
 * @param options opts, such as `atomic`, `awaitWriteFinish`, `ignored`, and others
 * @returns an instance of FSWalker for chaining.
 * @example
 * const walker = walk('.').on('all', (event, path) => { console.log(event, path); });
 * walk('.', { atomic: true, awaitWriteFinish: true, ignored: (f, stats) => stats?.isFile() && !f.endsWith('.js') })
 */
export function walk(paths: string | string[], options: FSWalkerOptions = {}): FSWalker {
  const walker = new FSWalker(options);
  walker.add(paths);
  return walker;
}

class FSWalker extends Readable {
  private readonly opts: FSWlkrOptions;
  private paths: Path[] = [];
  private running = false;

  constructor (options: FSWalkerOptions) {
    Object.keys(options).forEach(key => {
      if (!['cwd', 'ignored', 'base'].includes(key)) throw new Error(`Unmanaged chokidar option "${key}".`);
    });
    super({ objectMode: true, read () {} });
    this.opts = {
      ...options,
      ignored: arrify(options.ignored)
    }
    this.opts.cwd = npath.resolve(this.opts.cwd ?? process.cwd());
    if (this.opts.base)
      this.opts.base = npath.resolve(process.cwd(), this.opts.base);
  }

  add (paths: Path | Path[]) {
    if (this.readableEnded) throw new Error('Cannot add after "end" event');
    paths = arrify(paths);
    paths = paths.map(pathItem => this.getAbsolutePath(pathItem));
    this.paths.push(...paths);
    if (!this.running) this.next();
  }

  getAbsolutePath (pathItem: Path) {
    if (this.opts.cwd && !npath.isAbsolute(pathItem))
      pathItem = npath.join(this.opts.cwd, pathItem);
    pathItem = pathItem.replace(/\\/gu, '/');
    return pathItem;
  }

  async next () {
    if (this.running) return;

    if (!this.paths.length) {
      this.push(null);
      return;
    }

    this.running = true;
    await this.process(this.paths.pop()!);
    this.running = false;
    this.next();
  }

  private async process (path: Path) {
    const relativePath = this.opts.base ?
      npath.relative(this.opts.base, path) :
      npath.relative(process.cwd(), path);

    if (await this.isIgnored(relativePath)) return;

    const stats = await fs.stat(path);
    if (await this.isIgnored(relativePath, stats)) return;

    const isDirectory = stats.isDirectory();
    const { base, cwd } = this.opts;
    const opts: VinylOptions = Object.assign({}, base ? {base} : {}, cwd ? {cwd} : {});
    if (isDirectory) opts.read = false;

    const vinyl = await vinylFile(path, opts);
    this.push(vinyl);

    if (isDirectory) {
      const paths = await fs.readdir(path);
      this.paths.push(...paths.map(pathItem => `${path}/${pathItem}`));
    }
  }

  async isIgnored (...args: [path: Path, stats?: Stats]) {
    let [path, stats] = args;
    path = path.replace(/\\/gu, '/');
    for (const matcher of this.opts.ignored) {
      if (typeof matcher === 'string') return matcher === path;
      if (matcher instanceof RegExp) return matcher.test(path);
      if (typeof matcher === 'function') return await matcher(path, stats);
      if (matcher.recursive) return path.startsWith(matcher.path);
      return path === matcher.path;
    }
  }
}

function arrify <T>(item?: T | T[]): T[] {
  if (!item) return [];
  if (Array.isArray(item)) return item;
  return [item];
}
