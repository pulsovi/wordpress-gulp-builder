import path from 'path';

import mysql from 'mysql2';

import { fs } from './fs';
import { onIdle } from './onIdle';

const config: { server: { root: string; }} = JSON.parse(fs.readFileSync('.gulpconfig.json', 'utf8'));

type SyncOrPromise<T> = T | Promise<T>;

type Ftype = mysql.RowDataPacket[][] | mysql.RowDataPacket[] | mysql.OkPacket | mysql.OkPacket[] | mysql.ResultSetHeader;
type Values = any | any[] | { [param: string]: any };
export async function query<T extends Ftype>(sql: string, values: Values): Promise<[T, mysql.FieldPacket[]]> {
  const connection = await getConnection();
  return await connection.promise().query<T>(sql, values);
}

let connection: SyncOrPromise<mysql.Connection> | null = null;
let closeConnection = () => {};
onIdle(() => closeConnection());
function getConnection (): SyncOrPromise<mysql.Connection> {
  try {
    if (!connection) {
      connection = getConnectionOptions().then(database => {
        const { prefix, ...options } = database;
        const db = mysql.createConnection({ ...options, /* debug: true */});
        // onIdle, close connection
        closeConnection = () => db.end();
        // on error, close connection
        db.on('error', error => {
          console.error('connection Error catched', error);
          db.connect();
        });
        connection = db;
        return db;
      });
    }

    return connection;
  } catch (error) {
    return Promise.reject(error);
  }
}

export async function getConnectionOptions (): Promise<Database> {
  const configFile = path.join(config.server.root, 'wp-config.php');
  const configContent = await fs.readFile(configFile, 'utf8');
  const prefix = /\$table_prefix\s*=\s*('|")(?<prefix>[a-z_0-9]+)\1;/u.exec(configContent)?.groups!.prefix;
  const database = /define\(\s*("|')DB_NAME\1,\s*('|")(?<dbname>[a-z-]+)\2\s*\);/u.exec(configContent)?.groups!.dbname;
  const user = /define\(\s*("|')DB_USER\1,\s*('|")(?<user>[a-z-]+)\2\s*\);/u.exec(configContent)?.groups!.user;
  const password = /define\(\s*("|')DB_PASSWORD\1,\s*('|")(?<password>[a-z-]+)\2\s*\);/u.exec(configContent)?.groups!.password;

  if (!database || !user || !password || !prefix) {
    console.log(configFile);
    console.log({ database, prefix, user, password });
    throw new Error('Impossible de lire les informations de configuration dans ce fichier');
  }

  return { database, prefix, user, password };
}

interface Database extends mysql.ConnectionOptions {
  /** Table prefix */
  prefix: string;
}
