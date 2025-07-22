import npath from "node:path";

import type Vinyl from "vinyl";

import { doAction } from "./doAction";
import { fs } from "./fs";

/**
 * Gulp action which remove the file if the file type is different on the server
 * File type is different if the file is a directory on the server and a file on the project or vice versa
 * @param base Base path of the dest file
 * @param cwd Server root path
 */
export function changeType(base: string, cwd: string) {
  return doAction(async (data: Vinyl) => {
    const dst = npath.join(cwd, base, data.relative);
    const stats = await fs.stat(dst).catch(() => null);
    if (!data.stat) data.stat = await fs.stat(data.path);
    if (
      (data.stat.isFile() && stats?.isDirectory()) ||
      (data.stat.isDirectory() && stats?.isFile())
    ) await fs.remove(dst);
  });
}