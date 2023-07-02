import { fs } from '../util/fs';

import { parallel } from 'gulp';

export const init = parallel(
  createTree,
  setGitignore,
);

async function createTree (cb) {
  await Promise.all([
    fs.ensureDir('src'),
    fs.ensureDir('vendor'),
  ]);
}

function setGitignore (cb) {
  addGitignore('/vendor', '# local files');
  addGitignore('/.gulpconfig.json', '# local files');
  addGitignore('/.phpintel', '# tmp files');
  addGitignore('/debug.log', '# tmp files');
  addGitignore('/build', '# generated files');
  addGitignore('/tsconfig.json', '# generated files');
  addGitignore('/gulpfile.ts', '# generated files');
}

function addGitignore (line: string, title: string): void {
  fs.ensureFileSync('.gitignore');
  const content = fs.readFileSync('.gitignore', 'utf8');
  const lines = content.split('\n');
  if (lines.includes(line)) return;
  if (title) {
    if (lines.includes(title)) {
      let index = lines.indexOf('', lines.indexOf(title));
      if (index === -1) index = lines.length;
      lines.splice(index, 0, line);
    }
    else lines.push(title, line, '');
  }
  else lines.push(line, '');
  fs.writeFileSync(lines.join('\n'), 'utf8');
}
