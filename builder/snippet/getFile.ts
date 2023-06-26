import path from 'path';

/** Return the absolute path of the main file of the given snippet */
export function snippetGetFile (snippetName: string, ext: string = 'php'): string {
  return path.resolve('src/snippets', snippetName, `${snippetName}.${ext}`);
}

/** Return array containing all the versions of possible main file of the given snippet */
export function snippetGetFiles (snippetName: string): string[] {
  return ['php', 'html'].map(ext => snippetGetFile(snippetName, ext));
}

/** Return the absolute path of the README.md file of the given snippet */
export function snippetGetDocFile (snippetName: string): string {
  return path.resolve('src/snippets', snippetName, 'README.md');
}
