import path from 'path';

/** Return the absolute path of the main file of the given snippet */
export function snippetGetFile (snippetName: string): string {
  return path.resolve('src/snippets', snippetName, `${snippetName}.php`);
}

/** Return the absolute path of the README.md file of the given snippet */
export function snippetGetDocFile (snippetName: string): string {
  return path.resolve('src/snippets', snippetName, 'README.md');
}
