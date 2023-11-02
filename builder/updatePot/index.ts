import stream from 'stream';

import { series, src, dest } from 'gulp';
import type Vinyl from 'vinyl';

import { fs } from '../util/fs';
import { pipelineFollowError } from '../util/pipelineFollowError';
import { pluginGetName } from '../plugin/getName';

import PotFile from './PotFile';

export function updatePot (cb) {
  return pipelineFollowError(
    src('./src/plugins/**/*.pot', { base: 'src' }),
    updatePotFile()
  );
}

/** Get pot file's plugin names and update them */
export function updatePotFile () {
  return new stream.Writable({
    objectMode: true,
    async write (data: Vinyl, _encoding, cb) {
      const pluginName = pluginGetName({ filename: data.path });
      const displayName = `updatePotFile_${pluginName}`;
      const task = Object.assign((cb) => updatePotFileTask(pluginName, data, cb), { displayName });
      series(task)(cb);
    }
  });
}

async function updatePotFileTask (pluginName:string, potFile: Vinyl, cb) {
  const pot = new PotFile(potFile);
  await new Promise(rs => {
    pipelineFollowError(
      src(`${pluginName}/**/*.tsx`, { cwd: 'src/plugins', base: `src/plugins/${pluginName}` }),
      tsxToPot(pot)
    ).on('close', rs);
  });
  await fs.writeFile(potFile.path, pot.toString(), 'utf8');
  cb();
}

function tsxToPot (potFile: PotFile) {
  const strings = potFile.getStrings();
  return new stream.Writable({
    objectMode: true,
    write (data: Vinyl, _encoding, cb) {
      const lines = data.contents?.toString().split('\n');
      if (!lines) return cb();
      lines.forEach((line, id) => {
        strings.forEach(string => {
          if (line.includes(`'${string}'`) || line.includes(`"${string}"`))
            potFile.addSourceFile(string, data.relative, id + 1);
        });
      });
      cb();
    }
  });
}
