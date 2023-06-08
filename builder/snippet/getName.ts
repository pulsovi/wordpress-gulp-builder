import path from 'path';

/** Parse file path and return the name of the snippet which own this file */
export function snippetGetName (pathname: string): string {
  const relative = path.relative('src/snippets', pathname);
  if (relative.startsWith('.')) throw new Error(`This file is not a snippet file : ${pathname}`);
  if (relative.includes(path.sep)) return relative.slice(0, relative.indexOf(path.sep));
  return relative;
}
