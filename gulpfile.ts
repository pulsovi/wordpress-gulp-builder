import path from 'path';
import Stream from 'stream';

import fsExtra from 'fs-extra';
import gulp from 'gulp';
import type { TaskFunction, TaskFunctionCallback } from 'gulp';
import filter from 'gulp-filter';
import markdown from 'gulp-markdown';
import watch from 'gulp-watch';
import zip from 'gulp-zip';
import mysql from 'mysql2';
import pumpify from 'pumpify';
import Vinyl from 'vinyl';

/** Add stack to fs errors */
const fs: typeof fsExtra = (() => {
  const retval: Partial<typeof fsExtra> = {};
  Object.entries(fsExtra).forEach(([name, func]: [string, any]) => {
    if (typeof func !== 'function') {
      retval[name] = func;
      return;
    }
    retval[name as any] = function (...args) {
      const { stack } = new Error('');
      try {
        const result = Reflect.apply(func, this, args);
        if (!(result instanceof Promise)) return result;
        return result.catch(error => Promise.reject(Object.assign(error, { stack })));
      } catch (error) {
        // Unable to create new Error here, the call stack is already broken
        return Promise.reject(Object.assign(error, { stack }));
      }
    }
  }, {});
  return retval as typeof fsExtra;
})();

interface Database extends mysql.ConnectionOptions {
  /** Table prefix */
  prefix: string;
}

const { src, dest, series, parallel, task } = gulp;

const config: { server: { root: string; }} = JSON.parse(fs.readFileSync('.gulpconfig.json', 'utf8'));

const base = 'src';

/** list of background services "close" functions */
const idle: (() => void)[] = [];

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
    .pipe(dest('.'));

  const cleaner =
    watch(`${config.server.root}/wp-content/plugins/${pluginName}/**`)
    .pipe(log())
    .pipe(doAction(async (data: Vinyl) => {
      if (['add'].includes(data.event)) return;
      if (!(await fs.stat('debug.log')).size) return;
      if (data.event === 'change') fs.truncate(`${config.server.root}/wp-content/debug.log`);
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

/** Watch on snippets dir and launch a watcher for each snippet */
function devSnippets (cb: TaskFunctionCallback) {
  const watchers = {};
  const watcher = gulp.watch(`src/snippets/*`, {
    ignoreInitial: false,
    events: ['addDir', 'unlinkDir']
  });

  watcher.on('addDir', snippetPath => {
    const snippetName = path.basename(snippetPath);
    if (snippetName in watchers) {
      cb(new Error(`Already watched snippet : ${snippetName}.`));
      return;
    }

    watchers[snippetName] = task(snippetWatch(snippetName))(cb);
  });

  watcher.on('unlinkDir', snippetName => {
    console.info('snippet removed:', snippetName);
    todo();
  });

  return watcher;
}

/** monitors a snippet's source code folder and pushes changes to the build and the server */
function snippetWatch(snippetName): string {
  const taskName = `snippetWatch(${snippetName})`;
  task(taskName, series(snippetServerBind(snippetName)));
  return taskName;
}

function snippetServerBind (snippetName) {
  return async function snippetServerSync (cb: Function) {
    const phpFilter = filter('**/*.php', { restore: true });
    const mdFilter = filter('**/*.md', { restore: true });

    const codeWatcher = watch(`src/snippets/${snippetName}/*.*`, { ignoreInitial: false })
      .pipe(log())
      .pipe(mdFilter)
      .pipe(markdown())
      .pipe(mdFilter.restore)
      .pipe(snippetDocFormat())
      .pipe(log('snippetDocFormat Output'))
      .pipe(phpFilter)
      .pipe(snippetCodePhpString())
      .pipe(snippetCodePhpToSnippet())
      .pipe(phpFilter.restore)
      .pipe(snippetServerUpdate(snippetName));

    return codeWatcher;
  }
}

function log (prefix = '', transformer = data => [data.event, data.path].join(' ')) {
  if (typeof prefix === 'function') {
    transformer = prefix;
    prefix = '';
  }

  return transform(data => {
    console.debug(prefix, transformer(data));
    return data;
  });
}

function snippetCodePhpToSnippet () {
  return transform(data => {
    data.contents = Buffer.from(data.contents.toString('utf8').replace(/^<\?php\s*/u, ''));
    return data;
  });
}

function snippetServerUpdate (snippetName) {
  const stream = new Stream.Writable({ objectMode: true, write });

  async function write (data, _encoding, cb) {
    if (!['add', 'change'].includes(data.event)) todo();

    const snippetId = await snippetGetId(snippetName).catch(error => { cb(error); });

    // snippet not installed on the server
    if (!snippetId) return cb();

    const db = await getConnectionOptions();
    const column = data.extname === '.php' ? 'code' : 'description';

    await query(
      `UPDATE \`${db.prefix}snippets\` SET \`${column}\` = ? WHERE \`id\` = ?`,
      [data.contents.toString(), snippetId]
    );

    cb();
  }

  return stream;
}

async function snippetGetId (snippetName) {
  const db = await getConnectionOptions();
  const snippetTitle = await cache(snippetGetTitle, [{ name: snippetName }, true, true]);
  const [response] = await query(
    `SELECT \`id\` FROM \`${db.prefix}snippets\` WHERE \`name\` = ? LIMIT 1;`,
    [snippetTitle]
  );
  console.log('snippetGetId', { snippetName, response });

  // snippet not installed on the server
  if (!Array.isArray(response) || !response.length || !('id' in response[0])) return null;
  return response[0].id;
}

const query = (() => {
  let connection = null;
  return query;

  type Ftype = mysql.RowDataPacket[][] | mysql.RowDataPacket[] | mysql.OkPacket | mysql.OkPacket[] | mysql.ResultSetHeader;
  type Values = any | any[] | { [param: string]: any };

  async function query<T extends Ftype>(sql: string, values: Values): Promise<[T, mysql.FieldPacket[]]> {
    const connection = await getConnection();
    return await connection.promise().query<T>(sql, values);
  }

  async function getConnection (): Promise<mysql.Connection> {
    try {
      if (!connection) {
        connection = getConnectionOptions().then(database => {
          const { prefix, ...options } = database;
          const db = mysql.createConnection(options);
          idle.push(() => db.end());
          return db;
        });
      }

      if (connection instanceof Promise) return await connection;

      return connection;
    } catch (error) {
      return Promise.reject(error);
    }
  }
})();

async function getConnectionOptions (): Promise<Database> {
  const configFile = path.join(config.server.root, 'wp-config.php');
  const configContent = await fs.readFile(configFile, 'utf8');
  const prefix = /\$table_prefix\s*=\s*('|")(?<prefix>[a-z_0-9]+)\1;/u.exec(configContent)?.groups.prefix;
  const database = /define\(\s*("|')DB_NAME\1,\s*('|")(?<dbname>[a-z-]+)\2\s*\);/u.exec(configContent)?.groups.dbname;
  const user = /define\(\s*("|')DB_USER\1,\s*('|")(?<user>[a-z-]+)\2\s*\);/u.exec(configContent)?.groups.user;
  const password = /define\(\s*("|')DB_PASSWORD\1,\s*('|")(?<password>[a-z-]+)\2\s*\);/u.exec(configContent)?.groups.password;

  if (!database || !user || !password || !prefix) {
    console.log(configFile);
    console.log({ database, prefix, user, password });
    throw new Error('Impossible de lire les informations de configuration dans ce fichier');
  }

  return { database, prefix, user, password };
}

module.exports.build = parallel(
  watchGulpfile,
  buildAllPlugins,
  buildAllSnippets,
  exitAtIdle,
);

function watchGulpfile (cb) {
  const watcher = gulp.watch([__filename, './.gulpconfig.json']);

  watcher.on('all', event => {
    console.info('File event :', event, __filename);
    process.exit(0);
  });

  idle.push(() => {
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
  const markdownFilter = filter('**/*.md', { restore: true });
  const zipFile = `${pluginName}_${await getPluginVersion(pluginName)}.zip`;

  return src(`${pluginName}/**`, { base: 'src/plugins', cwd: 'src/plugins' })
    .pipe(markdownFilter)
    .pipe(markdown({ gfm: true }))
    .pipe(github())
    .pipe(markdownFilter.restore)
    .pipe(zip(zipFile))
    .pipe(dest(`build/plugins/${pluginName}`));
}

  async function getPluginVersion (pluginName) {
    const pluginFile = `src/plugins/${pluginName}/${pluginName}.php`;
    const content = await fs.readFile(pluginFile, 'utf8');
    const versionRE = /^ \* Version:\s*(?<version>\S*)$/um;
    const match = content.match(versionRE);
    if (!match) throw new Error(`Unable to find version of this plugin : ${pluginName}`);
    return match.groups.version;
  }

/** List snippets and build each of them */
async function buildAllSnippets () {
  const stream = src('./src/snippets/*', { base: 'src' })
    .pipe(buildSnippet())
    .pipe(dest('./build'));
  const result = await new Promise(rs => { stream.on('close', rs); stream.on('end', rs); });

  return result;
}

/** Get snippet names and build them */
function buildSnippet () {
  return asyncTransform (async snippetVinyl => {
    try {
      const code = await snippetGetCode(snippetVinyl);
      const version = snippetGetVersion(code);
      const doc = await snippetGetDoc(snippetVinyl, version);
      return snippetBuildJSON({ code, doc, version, vinyl: snippetVinyl });
    } catch (error) {
      console.log(`Unable to build this snippet : ${snippetVinyl.basename}`);
      console.log(error);
    }
  });
}

  /** Get the snippet version from snippet code */
  function snippetGetVersion (code: string): string | null {
    const versionRE = /^ \* Version:\s*(?<version>\S*)$/um;
    const match = code.match(versionRE);
    if (match) return match.groups.version;
    return null;
  }

  /** Get and compile snippet code given it's root folder Vinyl */
  async function snippetGetCode (snippetVinyl) {
    return await src(`${snippetVinyl.basename}.php`, { cwd: snippetVinyl.path, allowEmpty: true })
      .pipe(snippetCodePhpString())
      .pipe(streamToString());
  }

/** Preprocess "<<<php_string filename>>>" strings */
function snippetCodePhpString () {
  return asyncTransform(async (fileVinyl) => {
    let code: string = fileVinyl.contents.toString('utf8');

    const matches: Record<string, string[]> = {};

    const phpStringRE = /<<<php_string (?<filename>.*?)\s*>>>/gu;
    for (const match of Array.from(code.matchAll(phpStringRE))) {
      const { filename } = match.groups;
      const pathname = path.resolve(fileVinyl.dirname, filename);
      matches[pathname] = matches[pathname] ?? [];
      if (!matches[pathname].includes(match[0])) matches[pathname].push(match[0]);
    }

    await Promise.all(Object.entries(matches).map(async ([destFile, strings]) => {
      const fileContent = await fs.readFile(destFile, 'utf8');
      const phpString = `'${fileContent.replace(/\\/gu, '\\\\').replace(/'/gu, "\\'")}'`;
      strings.forEach(string => {
        code = code.replace(new RegExp(string, 'gu'), phpString);
      });
    }));

    fileVinyl.contents = Buffer.from(code, 'utf8');
    return fileVinyl;
  });
}

/** Get the HTML doc of a snippet and the main title of it given it's root folder Vinyl */
async function snippetGetDoc (snippetVinyl, version) {
  return src('README.md', { allowEmpty: true, cwd: snippetVinyl.path })
    .pipe(markdown())
    .pipe(snippetDocFormat(version))
    .pipe(streamToString());
}

/** Compile snippet JSON form and return the corresponding Vinyl given it's root folder Vinyl */
function snippetBuildJSON({ code, doc, version, vinyl, scope = 'global' }) {
  if (!code) return;
  const date = new Date();
  const dateFormated = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  const codeFiltered = code.replace(/^<\?php\n?/u, '\n');

  const snippet = {
    name: snippetGetTitle({ code, doc }, true),
    scope,
    code: codeFiltered,
    desc: doc,
    priority: '10',
  };
  const data = {
    generator: 'Code Snippets v3.3.0',
    date_created: dateFormated,
    snippets: [snippet],
  };

  const jsonString = JSON.stringify(data, null, 2).replace(/\//gu, '\\/');
  vinyl.contents = Buffer.from(jsonString, 'utf8');
  vinyl.path += '/' + vinyl.basename + version + '.code-snippets.json'
  return vinyl;
}

  /** retrieve snippet title from its code, doc, or dirname */
  function snippetGetTitle (options, isRequired = false, async = false) {
    const codeMatch = options.code?.match(/^ \* (?:Snippet|Plugin) Name: (?<snippetName>.*)$/mu);
    if (codeMatch) {
      const title = codeMatch.groups.snippetName;
      if (title) return title;
    }

    const docMatch = options.doc?.match(/<h1[^>]*>(?<title>.*?)<\/h1>/u);
    if (docMatch) {
      const { title } = docMatch.groups;
      if (title) return title;
    }

    const mdMatch = options.md?.match(/^# (?<title>.*)\n/u);
    if (mdMatch) {
      const { title } = mdMatch.groups;
      if (title) return title;
    }

    if (async && options.name) {
      const { name } = options;
      const codeFile = `src/snippets/${name}/${name}.php`;
      const docFile = `src/snippets/${name}/README.md`;
      return fs.readFile(codeFile, 'utf8')
        .then(code => snippetGetTitle({ code, name }, true))
        .catch(() => fs.exists(docFile))
        .then(exists => {
          if (!exists) throw new Error('No docFile found');
          return fs.readFile(docFile, 'utf8');
        })
        .then(md => snippetGetTitle({ md, name }, isRequired))
        .catch(error => {
          throw new Error(`Impossible de récuperer le titre du snippet ${name}, ni à partir du fichier de code, ni à partir du fichier de doc.\nPour rendre cette détection possible, ajouter un fichier ${docFile} avec un titre, ou ajouter un [header](obsidian://open?vault=Vaults&file=David%20Gabison%2FArchive%2FPHP%20-%20WordPress%20-%20Snippets%20-%20En%20t%C3%AAte) au fichier de code ${codeFile}`);
        });
    }

    if (isRequired) throw new Error(`Cannot get title for this snippet : ${JSON.stringify(options)}`);
  }

  /** Return a StreamWritable with .then() method wich return the contents of the Vinyl */
  function streamToString () {
    let vinyl = null;
    const stream = new Stream.Writable({
      objectMode: true,
      write (data, _encoding, cb) {
        if (vinyl !== null) {
          return cb(new Error(
            'Only one vinyl can be stringified, two received : \n    -' +
            vinyl.path + '\n    -' + data.path
          ));
        }

        vinyl = data;
        cb?.();
      }
    });

    const result: Promise<string> = new Promise ((rs, rj) => {
      stream.on('close', () => rs(vinyl?.contents.toString('utf8')));
      stream.on('error', error => rj(error));
    });

    const promise: { then: (cb: ((text: Promise<string>) => void)) => void } = {
      then (cb) { cb(result); }
    };

    return Object.assign(stream, promise);
  }

  /**
   * Returns a stream which consumes both snippet files and
   * transforms the html one to snippet doc html string
   */
  function snippetDocFormat (version: string | null = null) {
    let versionFinal = version;
    return new Stream.Transform({
      objectMode: true,
      async transform (data: Vinyl, _encoding, cb) {
        if (data.extname === '.php') {
          versionFinal = snippetGetVersion(data.contents.toString());
          cb(null, data);
          return;
        }

        const doc = data.clone();
        cb();
        if (!versionFinal) {
          await new Promise<void>(resolve => {
            const to = setInterval(() => { if (versionFinal) { clearInterval(to); resolve(); } }, 200);
          });
        }

        // const filtered = doc.replace(//ug, '🔗');
        doc.contents = Buffer.from(`<div><p style="display: inline-block; margin: 0">Version ${versionFinal}</p><details style="display: inline-block; margin-left:1em;"><summary><h1>Documentation</h1></summary>${data.contents.toString()}</details></div>`);
        this.push(doc);
      },
    });
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

  return function cache (func, args, thisArg?: object) {
    const funcStore = store.has(func) ? store.get(func) : new WeakMap();
    store.set(func, funcStore);

    const thisArgKey = typeof thisArg === 'undefined' ? undefKey : thisArg;
    const thisArgStore = funcStore.has(thisArgKey) ? funcStore.get(thisArgKey) : {};
    funcStore.set(thisArgKey, thisArgStore);

    const argsKey = JSON.stringify(args);
    if (!(argsKey in thisArgStore)) thisArgStore[argsKey] = Reflect.apply(func, thisArg, args);
    return thisArgStore[argsKey];
  };
})();

function isObject (val): val is Record<PropertyKey, unknown> {
  return val && typeof val === 'object';
}

function exitAtIdle (cb) {
  const to = setInterval(() => {
    try {
      if ((process as any)._getActiveRequests().length) return;
      idle.forEach(cb => { cb(); });
      clearInterval(to);
      cb();
    } catch (error) {
      console.error(error);
    }
  }, 200);
}
