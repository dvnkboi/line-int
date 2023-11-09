import { Cached, Caches } from './cacheDecorator.js';
import { Cache, CacheOptions } from './cache.js';
import { ICache } from './iCacheProvider.js';
import { ObjectCache, PersistentCache } from './cacheProviders.js';
import { Container } from '../DI/index.js';

Container.provide([{
  provide: Cache,
  useFactory: () => new Cache()
}]);

export {
  Cache,
  ObjectCache,
  PersistentCache,
  Cached,
  Caches
};

export type {
  CacheOptions
};

export type {
  ICache
};