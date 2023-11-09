import { type RouterOptions } from 'express';
import { type Middleware } from './middleware.js';

/**
 * Cached(meta) parameter configuration
 *
 * @export
 * @interface ParameterConfiguration
 */
export interface ParameterConfiguration {
    index: number;
    type: ParameterType;
    name?: string;
    data?: any;
}
/**
 * Cached(meta) route configuration
 *
 * @export
 * @interface Route
 */
export interface Route {
    method: string;
    url: string;
    middleware: Middleware[];
}
/**
 * Method metadata object
 */
export interface MethodMeta {
    routes: Route[];
    status?: number;
}
/**
 * Express decorators controller metadata
 *
 * @export
 * @interface ExpressMeta
 */
export interface ExpressMeta {
    url: string;
    routerOptions?: RouterOptions;
    routes: {
        [instanceMethodName: string]: MethodMeta;
    };
    middleware: Middleware[];
    params: {
        [key: string]: ParameterConfiguration[];
    };
    type: 'controller' | 'stream';
}


/**
 * Express decorators controller
 *
 * @export
 * @interface ExpressMeta
 */
export interface ExpressClass {
    __express_meta__?: ExpressMeta;
}


/**
 * All possible parameter decorator types
 * @export
 * @enum {number}
 * 
**/
export enum ParameterType {
    REQUEST = 0,
    RESPONSE = 1,
    PARAMS = 2,
    QUERY = 3,
    BODY = 4,
    HEADERS = 5,
    COOKIES = 6,
    NEXT = 7,
    QUEUE = 8,
    AUTH = 9,
    DEFAULT = 99
}

const defaultMeta = (): ExpressMeta => {
    return {
        url: '',
        middleware: [],
        routes: {},
        params: {},
        type: 'controller'
    };
};

/**
 * Get or initiate metadata on a target
 *
 * @param {ExpressClass} target
 * @returns {ExpressMeta}
 */
export function getMeta(target: ExpressClass): ExpressMeta {

    const meta = Reflect.getMetadata('exMeta', target);

    if (!meta) {
        setMeta(target, defaultMeta());
        return defaultMeta();
    }

    return meta;
}

export function setMeta(target: ExpressClass, meta: Partial<ExpressMeta> = {}) {
    const metaExits = Reflect.getMetadata('exMeta', target) ?? defaultMeta();
    Reflect.defineMetadata('exMeta', {
        ...metaExits,
        ...meta
    }, target);
};