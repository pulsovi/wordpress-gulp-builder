import path from "path";
import { pluginGetVersion } from "./getVersion.js";

export default class Plugin {
  public readonly name: string;
  private _version: SyncOrPromise<string>;
  public version: string;

  public constructor (name: string) {
    this.name = name;
  }

  public getDir () {
    return path.join('./src/plugins', this.name);
  }

  public async getVersion () {
    if (this.version) return this.version;
    if (!this._version) this._version = pluginGetVersion({...this, async: true, isRequired: true});
    this.version = await this._version;
    return this.version;
  }
}
