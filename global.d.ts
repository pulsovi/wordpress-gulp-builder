declare module 'lead' {
  import { Readable } from "node:stream";
  export default function sink <T extends Readable>(stream: T): T;
}
