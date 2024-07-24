import path from "path";
import { fs } from "../util/fs.js";
import Snippet from "./Snippet.js";

export async function snippetListAll () {
  const snippetDir = './src/snippets';
  if (!await fs.exists(snippetDir)) return [];
  const dirents = await fs.readdir(snippetDir, { withFileTypes: true });
  const snippets = await Promise.all(dirents.map(async dirent => {
    if (!dirent.isDirectory()) return null;
    if (!await fs.exists(path.join(snippetDir, dirent.name, `${dirent.name}.php`))) return null;
    return new Snippet(dirent.name);
  }));
  return snippets.filter((item): item is Snippet => Boolean(item));
}
