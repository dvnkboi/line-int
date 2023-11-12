import { ICache } from "./iCacheProvider.js";
import { useCircularReferenceReplacer } from "../generators/json.js";
import 'reflect-metadata';
import { Container } from "../DI/container.js";
import { Cache } from './cache.js';


// create a cache decorator for a function that returns a promise and caches the result
export function Cached(key?: string, expiry = 1000 * 60, validator: (result: unknown) => boolean = () => true) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {

    const originalMethod = (Reflect.getOwnPropertyDescriptor(target, propertyKey)?.value) as Function;

    if (originalMethod === undefined || typeof originalMethod !== 'function') {
      throw new Error('Cached decorator can only be applied to functions');
    }

    Reflect.defineMetadata('cxMethod', {
      validator,
      expiry,
      key: key ?? propertyKey,
    }, target, propertyKey);
    return target;
  };
}

export function Caches(): ClassDecorator {
  return target => {
    let cacheService: Promise<ICache> = Container.get(Cache);
    if (!cacheService) throw new Error('Cache is not injected');
    for (const key of Object.getOwnPropertyNames(target.prototype)) {
      const meta = Reflect.getMetadata('cxMethod', target.prototype, key);
      if (meta === undefined || !meta.key === undefined) continue;
      const originalMethod = Reflect.getOwnPropertyDescriptor(target.prototype, key)?.value as Function;
      target.prototype[key] = async function (...args: any[]) {
        const cache = await cacheService;
        const cacheKey = meta.key + JSON.stringify(args, useCircularReferenceReplacer(1));
        const cachedResult = await cache.get(cacheKey);
        if (cachedResult) {
          return cachedResult;
        }
        const result = await originalMethod.apply(this, args);
        if (!meta.validator(result)) return result;
        await cache.set(cacheKey, result, meta.expiry);
        return result;
      };
      // console.log(`Cache injected: ${key}`, meta.key, meta.expiry, meta.validator ? 'has validator' : '');
    }
    return target;
  };
}
