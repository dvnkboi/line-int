import { readFile, rm, writeFile, } from "fs/promises";
import { $dir } from "../env/index.js";
import { ICacheProvider } from "./iCacheProvider.js";

const cache: { [tag: string]: { [key: string]: CacheValue; }; } = {};

type CacheValue = {
  value: any;
  expiry: number;
};

export class ObjectCache implements ICacheProvider {
  private _tag: string;
  private _expiry: number;
  private static caches: Map<string, ObjectCache> = new Map<string, ObjectCache>();

  constructor (tag: string, expiry: number = 1000 * 60 * 60) {
    this.tag = tag;
    this.expiry = expiry;
    cache[tag] = {};
    if (!ObjectCache.caches.has(tag)) {
      ObjectCache.caches.set(tag, this);
    }
  }

  public async get<T = any>(key: string): Promise<T | null> {
    const data = cache[this.tag][key];
    if (data && data.expiry > Date.now()) {
      return data.value;
    }
    delete cache[this.tag][key];
    return null;
  }

  public async set(key: string, value: any, expiry = this._expiry) {
    cache[this.tag][key] = {
      value,
      expiry: Date.now() + expiry
    };
  }

  public async exists(key: string) {
    return !!this.get(key);
  }

  public async delete(key: string) {
    delete cache[this.tag][key];
  }

  public async destroy() {
    delete cache[this.tag];
  }

  public get tag(): string {
    return this._tag;
  }

  public set tag(tag: string) {
    this._tag = tag;
  }

  public get expiry(): number {
    return this._expiry;
  }

  public set expiry(expiry: number) {
    this._expiry = expiry;
  }
}

//persistent json cache provider using fs module to write to disk
export class PersistentCache implements ICacheProvider {
  private _tag: string;
  private _expiry: number;
  private _file: any;
  private _writeTick: NodeJS.Timeout;
  private _writeTickInterval: number = 1000;
  private _path = '';
  private inMemory: boolean = false;

  constructor (tag: string, expiry: number = 1000 * 60) {
    this.tag = tag;
    this.expiry = expiry;
    this._path = $dir('/src/utils/cache/store') + `/${tag}.json`;
    this._writeTickInterval = expiry / 2;
  }

  private async read() {
    if (this.inMemory) return this._file;
    try {
      this._file = JSON.parse(await readFile(this._path, 'utf-8'));
    }
    catch (e) {
      this._file = {};
    }
    this.inMemory = true;
    return this._file;
  }

  private async write() {
    return new Promise((resolve) => {
      clearTimeout(this._writeTick);
      this._writeTick = setTimeout(async () => {
        await writeFile(this._path, JSON.stringify(this._file));
        resolve(true);
      }, this._writeTickInterval);
    });
  }

  public async get<T = any>(key: string): Promise<T | null> {
    const data = await this.read();
    if (data && data[key] && data[key].expiry > Date.now()) {
      return data[key].value;
    }
    delete data[key];
    this.write();
    return null;
  }

  public async set(key: string, value: any, expiry = this._expiry) {
    const data = await this.read();
    data[key] = {
      value,
      expiry: Date.now() + expiry
    };
    this.write();
  }

  public async exists(key: string) {
    return !!this.get(key);
  }

  public async delete(key: string) {
    const data = await this.read();
    delete data[key];
    this.write();
  }

  public async destroy() {
    await rm(this._path);
    clearTimeout(this._writeTick);
    this._file = null;
    this.inMemory = false;
  }


  public get tag(): string {
    return this._tag;
  }

  public set tag(tag: string) {
    this._tag = tag;
  }

  public get expiry(): number {
    return this._expiry;
  }

  public set expiry(expiry: number) {
    this._expiry = expiry;
  }
}