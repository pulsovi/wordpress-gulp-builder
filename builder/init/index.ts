import { fs } from '../util/fs.js';

import gulp from 'gulp'; const { parallel } = gulp;

export const init = parallel(
  createTree,
  setGitignore,
  setPackageJson,
);

async function createTree (cb) {
  await Promise.all([
    fs.ensureFile('src/plugins/.gitkeep'),
  ]);
  cb();
}

function setGitignore (cb) {
  addGitignore('/vendor', '# local files');
  addGitignore('/.wpbuilderrc.json', '# local files');
  addGitignore('/.phpintel', '# tmp files');
  addGitignore('/debug.log', '# tmp files');
  addGitignore('/build', '# generated files');
  addGitignore('/tsconfig.json', '# generated files');
  addGitignore('/gulpfile.ts', '# generated files');
  addGitignore('node_modules', '# npm files');
  cb();
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
  fs.writeFileSync('.gitignore', lines.join('\n'), 'utf8');
}

function setPackageJson (cb) {
  const json = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  // set workspaces
  json.workspaces = json.workspaces || [];
  if (!json.workspaces.includes('src/plugins/*')) json.workspaces.push('src/plugins/*');

  // set scripts
  json.scripts = json.scripts ?? {};
  json.scripts.dev = json.scripts.dev ?? 'yarn wpbuilder dev';
  if (process.argv.includes('--full')) {
    json.scripts.build = json.scripts.build ?? 'yarn prebuild && yarn wpbuilder build && yarn postbuild';
    json.scripts.prebuild = json.scripts.prebuild ?? "cp *.sublime-project sproject.dat && git stash push -m 'yarn prebuild' --include-untracked";
    json.scripts.postbuild = json.scripts.postbuild ?? "((git stash list | grep $(git rev-parse --short HEAD) | grep 'yarn prebuild') || (git stash list | grep $(git rev-parse --abbrev-ref HEAD) | grep 'yarn prebuild')) && git stash pop && mv sproject.dat *.sublime-project"
  } else {
    json.scripts.build = json.scripts.build ?? 'yarn wpbuilder build';
  }

  fs.writeFileSync('package.json', JSON.stringify(json, null, 2), 'utf8');
  cb();
}
