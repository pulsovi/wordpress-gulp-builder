import { exec } from 'node:child_process';
import { subprocessStdout } from './subprocess.js';

export async function gitGetBranch () {
  const subprocess = exec('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' });
  const stdout = await subprocessStdout(subprocess);
  return stdout.trim();
}