import path from 'path';

import mysql from 'mysql2';

import { getConfig } from './config.js';
import { fs } from './fs.js';
import { onIdle } from './onIdle.js';

type SyncOrPromise<T> = T | Promise<T>;

const { prefix, ...connectionOptions } = getConnectionOptions();
const connection = mysql.createPool({
  connectionLimit : 10,
  ...connectionOptions
});

type Ftype = mysql.RowDataPacket[][] | mysql.RowDataPacket[] | mysql.OkPacket | mysql.OkPacket[] | mysql.ResultSetHeader;
type Values = any | any[] | { [param: string]: any };
export async function query<T extends Ftype>(sql: string, values: Values): Promise<[T, mysql.FieldPacket[]]> {
  return await connection.promise().query<T>(sql, values);
}

export function getConnectionOptions (): Database {
  const configFile = path.join(getConfig().server.root, 'wp-config.php');
  const configContent = fs.readFileSync(configFile, 'utf8');
  const prefix = /\$table_prefix\s*=\s*('|")(?<prefix>(?:\\\1*|.*?))\1;/u.exec(configContent)?.groups!.prefix;
  const database = /define\(\s*("|')DB_NAME\1,\s*('|")(?<dbname>(?:\\\2*|.*?))\2\s*\);/u.exec(configContent)?.groups!.dbname;
  const user = /define\(\s*("|')DB_USER\1,\s*('|")(?<user>(?:\\\2*|.*?))\2\s*\);/u.exec(configContent)?.groups!.user;
  const password = /define\(\s*("|')DB_PASSWORD\1,\s*('|")(?<password>(?:\\\2*|.*?))\2\s*\);/u.exec(configContent)?.groups!.password;

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
