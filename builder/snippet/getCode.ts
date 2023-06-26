import { src } from 'gulp';

import { fs } from '../util/fs';
import { pipelineFollowError } from '../util/pipelineFollowError';
import { streamToString } from '../util/streamToString';

import { snippetProcessCode } from './processCode';
import { snippetGetFiles } from './getFile';

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
