import { inspect } from "util";
import { MethodMeta, getMeta, setMeta } from "../meta.js";
import { Middleware } from "../middleware.js";
/**
 * Route decorator factory, creates decorator
 */
function decoratorFactory(method, url, middleware = []): MethodDecorator {
    return (target, key, descriptor) => {
        const meta = getRouteMeta(target, key.toString());
        meta.routes.push({ method, url, middleware });
        setRouteMeta(target, key.toString(), meta);
        return descriptor;
    };
}
/**
 * All routes
 *
 * Special-cased "all" method, applying the given route `path`,
 * middleware, and callback to _every_ HTTP method.
 */
export function All(url: string, middleware?: Middleware[]): (target: object, key: string, descriptor: any) => any {
    return decoratorFactory('all', url, middleware);
}
/**
 * Get route
 */
export function Get(url: string, middleware?: Middleware[]): (target: object, key: string, descriptor: any) => any {
    return decoratorFactory('get', url, middleware);
}
/**
 * Post route
 */
export function Post(url: string, middleware?: Middleware[]): (target: object, key: string, descriptor: any) => any {
    return decoratorFactory('post', url, middleware);
}
/**
 * Put route
 */
export function Put(url: string, middleware?: Middleware[]): (target: object, key: string, descriptor: any) => any {
    return decoratorFactory('put', url, middleware);
}
/**
 * Delete route
 */
export function Delete(url: string, middleware?: Middleware[]): (target: object, key: string, descriptor: any) => any {
    return decoratorFactory('delete', url, middleware);
}
/**
 * Patch route
 */
export function Patch(url: string, middleware?: Middleware[]): (target: object, key: string, descriptor: any) => any {
    return decoratorFactory('patch', url, middleware);
}
/**
 * Options route
 */
export function Options(url: string, middleware?: Middleware[]): (target: object, key: string, descriptor: any) => any {
    return decoratorFactory('options', url, middleware);
}
/**
 * Head route
 *
 */
export function Head(url: string, middleware?: Middleware[]): (target: object, key: string, descriptor: any) => any {
    return decoratorFactory('head', url, middleware);
}
/**
 * Method status
 */
export function Status(status: number): (target: object, key: string, descriptor: any) => any {
    return (target, key, descriptor) => {
        const meta = getRouteMeta(target, key);
        meta.status = status;
        setRouteMeta(target, key, meta);
        return descriptor;
    };
}

export function getRouteMeta(target: object, key: string) {
    const meta = getMeta(target);
    let methodMetadata = meta.routes[key.toString()];
    if (!methodMetadata) methodMetadata = { routes: [] };
    return methodMetadata;
}

export function setRouteMeta(target: object, key: string, methodMetadata: MethodMeta = { routes: [] }) {
    const meta = getMeta(target);
    meta.routes[key.toString()] = methodMetadata;
    setMeta(target, meta);
}