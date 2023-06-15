import path from 'path';
import Stream from 'stream';

import chalk from 'chalk';
import gulp from 'gulp';
import type { TaskFunction, TaskFunctionCallback } from 'gulp';
import globFilter from 'gulp-filter';
import markdown from 'gulp-markdown';
import watch from 'gulp-watch';
import zip from 'gulp-zip';
import mysql from 'mysql2';
import pumpify from 'pumpify';
import Vinyl from 'vinyl';

import {
  fs,
  log,
  onIdle,
  snippetBuildAll,
  snippetHotUpdate,
  snippetProcessCode,
  snippetProcessDoc,
  todo,
  vinylFilter,
} from './builder';

Error.stackTraceLimit = Infinity;

const { src, dest, series, parallel, task } = gulp;

const config: { server: { root: string; }} = JSON.parse(fs.readFileSync('.gulpconfig.json', 'utf8'));

const base = 'src';


Error.stackTraceLimit = Infinity;

module.exports.dev = parallel(
  watchGulpfile,
  devPlugins,
  devSnippets,
);

/** Watch on plugins dir and launch a watcher for each plugin */
function devPlugins () {
  const watchers = {};
  const watcher = gulp.watch(`src/plugins/*`, {
    ignoreInitial: false,
    events: ['addDir', 'unlinkDir']
  });

  watcher.on('addDir', pluginPath => {
    const pluginName = path.basename(pluginPath);
    if (pluginName in watchers) {
      console.warn(`WARNING: Already watched plugin '${pluginName}'`);
      return;
    }
    watchers[pluginName] = pluginWatch(pluginName);
  });

  watcher.on('unlinkDir', pluginName => {
    console.info('Plugin removed:', pluginName);
    todo();
  });

  return watcher;
}

/** watch for a plugin change, build and copy files to server */
async function pluginWatch (pluginName, cb = () => {}) {
  return series(
    pluginServerClean.bind(null, pluginName),
    parallel(
      pluginServerBind.bind(null, pluginName),
      pluginServerLoadI18n.bind(null, pluginName),
      pluginServerDebugBind.bind(null, pluginName),
      pluginServerDocumentation.bind(null, pluginName),
    ),
  )(cb);
}

function pluginServerClean (pluginName) {
  return fs.rm(
    path.join(config.server.root, 'wp-content/plugins', pluginName),
    { force: true, recursive: true }
  );
}

function pluginServerBind (pluginName) {
  const base = 'src';
  const cwd = `src/plugins/${pluginName}`;

  return pumpify.obj([
    /**
     * Fichiers compilés à n'envoyer qu'une fois
     *
     * ils sont compilés sur le serveur et sont renvoyés ici par `pluginServerLoadI18n`
     * si on les suivait avec watch, on aurait une boucle infinie
     */
    src(['./**/*.po', '**/*.mo'], { base, cwd }),

    // fichiers à envoyer au serveur sans compilation
    watch([
      '**/*.css',
      '**/*.js',
      '**/*.php',
      '**/*.pot',
    ], { base, cwd, ignoreInitial: false }),
  ])
    .pipe(unlinkDest('.', { cwd: `${config.server.root}/wp-content` }))
    .pipe(dest('.', { cwd: `${config.server.root}/wp-content` }));
}

function pluginServerDebugBind (pluginName) {
  const loader =
    watch('debug.log', { cwd: `${config.server.root}/wp-content` })
    .pipe(log())
    .pipe(vinylFilter((data: Vinyl) => Boolean(data.stat.size)))
    .pipe(dest('.'));

  const cleaner =
    watch('src/**/*')
    .pipe(doAction(async (data: Vinyl) => {
      if (['add'].includes(data.event)) return;
      if (!(await fs.stat('debug.log')).size) return;
      if (data.event === 'change') fs.truncate(`${config.server.root}/wp-content/debug.log`);
      if (data.event === 'change') await fs.truncate(`${config.server.root}/wp-content/debug.log`);
      else console.log(new Error('Unknown event ' + data.event));
    }));

  return pumpify.obj([loader, cleaner]);
}

async function pluginServerLoadI18n (pluginName) {
  const base = `${config.server.root}/wp-content`
  const cwd = `${base}/plugins/${pluginName}`;
  await fs.ensureDir(cwd);
  return watch(['**/*.mo', '**/*.po'], { base, cwd, ignoreInitial: true })
    .pipe(unlinkDest('.', { cwd: 'src' }))
    .pipe(dest('.', { cwd: 'src' }))
}

function pluginServerDocumentation (pluginName) {
  return watch('**/*.md', { base: 'src', cwd: `src/plugins/${pluginName}`, ignoreInitial: false })
    .pipe(log())
    .pipe(markdown({ gfm: true }))
    .pipe(github())
    .pipe(dest('.', { cwd: `${config.server.root}/wp-content` }));
}

function github () {
  // https://github.com/sindresorhus/github-markdown-css
  const template = fs.readFile('model.html', 'utf8');
  return asyncTransform(async data => {
    const title = data.stem;
    const body = data.contents.toString();
    const html = (await template).replace('<<<title>>>', title).replace('<<<body>>>', body);
    data.contents = Buffer.from(html);
    return data;
  });
}

function unlinkDest (outFolder, opt) {
  const stream = new Stream.Transform({ objectMode: true });
  stream._transform = async function (data, _encoding, cb) {
    switch (data.event) {
      case undefined:
      case 'add':
      case 'change':
        this.push(data);
        break;
      case 'unlink':
        await fs.rm(path.join(opt?.cwd ?? '.', outFolder, data.relative));
        break;
      default:
        console.error(new Error('ERROR unlinkDest : Unknown event' + data.event));
        todo();
    }
    cb?.();
  }
  return stream;
}

function logMove () {
  return transform(data => {
    const src = data.history[0];
    const dest = data.history.slice(-1)[0];
    console.debug(src.padStart(dest.length), '=>');
    console.debug(dest.padStart(src.length), '\n');
    return data;
  });
}

/**
 * @param {(Vinyl) => void} action Callback who get the vinyl data and perform synchronous action
 */
function doAction (action) {
  return transform (data => {
    action(data);
    return data;
  })
}

/** Watch on snippets dir and update the server version of the snippet on each change */
function devSnippets (cb: TaskFunctionCallback) {
  return watch(`src/snippets/*/*`, { ignoreInitial: false })
    .pipe(log())
    .pipe(snippetProcessDoc())
    .pipe(snippetProcessCode())
    .pipe(snippetHotUpdate());
}

module.exports.build = parallel(
  buildAllPlugins,
  snippetBuildAll,
  onIdle.start,
);

function watchGulpfile (cb) {
  const watcher = gulp.watch([__filename, './.gulpconfig.json', './builder/**/*']);

  watcher.on('all', (event, filename) => {
    console.info('File event :', event, filename);
    process.exit(0);
  });

  onIdle(() => {
    watcher.close();
    cb();
  });
}

/** List plugins and build each of them */
async function buildAllPlugins (cb) {
  const pluginNames = await fs.readdir('src/plugins');
  parallel(...pluginNames.map(pluginName => buildPlugin.bind(null, pluginName)))(cb);
}

/** Get plugin names and build them */
async function buildPlugin (pluginName) {
  const markdownFilter = globFilter('**/*.md', { restore: true });
  const zipFile = `${pluginName}_${await getPluginVersion(pluginName)}.zip`;

  return src(`${pluginName}/**`, { base: 'src/plugins', cwd: 'src/plugins' })
    .pipe(markdownFilter)
    .pipe(markdown({ gfm: true }))
    .pipe(github())
    .pipe(markdownFilter.restore)
    .pipe(zip(zipFile))
    .pipe(dest(`build/plugins/${pluginName}`));
  }
}

  async function getPluginVersion (pluginName) {
    const pluginFile = `src/plugins/${pluginName}/${pluginName}.php`;
    const content = await fs.readFile(pluginFile, 'utf8');
    const versionRE = /^ \* Version:\s*(?<version>\S*)$/um;
    const match = content.match(versionRE);
    if (!match) throw new Error(`Unable to find version of this plugin : ${pluginName}`);
    return match.groups!.version;
  }

function todo (message = null): never {
  if (message) console.info(message);
  console.error(new Error('TODO: cette route n\'est pas terminée'));
  process.exit(1);
}

function transform (transformer: (data: Vinyl) => Vinyl) {
  const stream = new Stream.Transform({ objectMode: true });

  stream._transform = function (data: Vinyl, _encoding, cb) {
    this.push(transformer(data));
    cb?.();
  }

  return stream;
}

function asyncTransform (transformer) {
  const stream = new Stream.Transform({ objectMode: true });

  stream._transform = async function (data, encoding, cb) {
    try {
      const transformed = await transformer(data, encoding, this);
      if (transformed) this.push(transformed);
    } catch (error) {
      console.log(error);
    }
    cb?.();
  }

  return stream;
}

const cache = (() => {
  const store = new WeakMap();
  const undefKey = {};

  return cache;

  function cache <T extends unknown[], U>(func: (...args: T) => U, args: T, thisArg?: object): U;
  function cache (func: Function, args?: unknown[], thisArg?: object): unknown {
    const funcStore = store.has(func) ? store.get(func) : new WeakMap();
    store.set(func, funcStore);

    const thisArgKey = typeof thisArg === 'undefined' ? undefKey : thisArg;
    const thisArgStore = funcStore.has(thisArgKey) ? funcStore.get(thisArgKey) : {};
    funcStore.set(thisArgKey, thisArgStore);

    const argsKey = JSON.stringify(args);
    if (!(argsKey in thisArgStore)) thisArgStore[argsKey] = Reflect.apply(func, thisArg, args);
    return thisArgStore[argsKey];
  }
})();

function isObject (val): val is Record<PropertyKey, unknown> {
  return val && typeof val === 'object';
}

type SyncOrPromise<T> = T | Promise<T>;
