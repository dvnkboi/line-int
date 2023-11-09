import { Injectable } from '@decorators/di';
import { ObjectCache } from './cacheProviders.js';
import { ICache, ICacheProvider } from './iCacheProvider.js';

interface Type<T> extends Function {
  new(...args: any[]): T;
}

export type CacheOptions = {
  tag: string;
  expiry?: number;
  provider?: Type<ICacheProvider>;
};

const defaultOptions: CacheOptions = {
  tag: 'default',
  expiry: 1000 * 60,
  provider: ObjectCache,
};

@Injectable()
export class Cache implements ICache {
  private _tag: string;
  private _expiry: number;
  private provider: ICacheProvider;

  constructor (options: CacheOptions = defaultOptions) {
    options = {
      ...defaultOptions,
      ...options,
    };
    if (options.provider) this.provider = new options.provider(options.tag, options.expiry);
    this.tag = options.tag;
    this.expiry = options.expiry ?? 1000 * 60;
  }

  public setProvider(provider: ICacheProvider) {
    if (!provider) throw new Error('provider is required');
    this.provider = provider;
  }

  public async get<T = any>(key: string) {
    const res = await this.provider.get<T>(key);
    return res;
  }

  public async set(key: string, value: string, expiry?: number) {
    await this.provider.set(key, value, expiry);
  }

  public async exists(key: string) {
    const res = await this.provider.get(key);
    return res;
  }

  public async delete(key: string) {
    await this.provider.delete(key);
  }

  public async destroy() {
    await this.provider.destroy();
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