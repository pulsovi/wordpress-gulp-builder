import { fs } from './fs';

export const config: { server: { root: string; }} =
  JSON.parse(fs.readFileSync('.gulpconfig.json', 'utf8'));
