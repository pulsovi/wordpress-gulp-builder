import gulp from 'gulp'; const { src } = gulp;

import { fs } from '../util/fs.js';
import { pipelineFollowError } from '../util/pipelineFollowError.js';
import { streamToString } from '../util/streamToString.js';

import { snippetProcessCode } from './processCode.js';
import { snippetGetFiles } from './getFile.js';

/** Get and compile snippet code given it's root folder Vinyl */
export async function snippetGetCode (snippetName: string, allowEmpty: false): Promise<string>;
export async function snippetGetCode (snippetName: string, allowEmpty?: true): Promise<string | undefined>;
export async function snippetGetCode (snippetName: string, allowEmpty = true): Promise<string | undefined> {
  const files = await Promise.all(snippetGetFiles(snippetName).map(
    async file => ({ file, exists: await fs.exists(file) })
  ));
  const file = files.find(file => file.exists)?.file;
  if (!file) throw new Error('Unable to find snippet main file');
  return await pipelineFollowError(
    src(file, { allowEmpty }),
    snippetProcessCode(),
    streamToString()
  );
}
