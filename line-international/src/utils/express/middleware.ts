import { type Request, type Response, type NextFunction, type RequestHandler, type ErrorRequestHandler } from 'express';
import { InjectionToken } from '@decorators/di';
import { Container } from "../DI/index.js";



export type Type<C extends object = object> = new (...args: any) => C;
export type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => void;
export interface MiddlewareClass {
    use: MiddlewareFunction;
}
export type Middleware = MiddlewareFunction | Type<MiddlewareClass>;
export type ErrorMiddlewareFunction = (error: Error, request: Request, response: Response, next: NextFunction) => void;
export interface ErrorMiddlewareClass {
    use: ErrorMiddlewareFunction;
}
export type ErrorMiddleware = ErrorMiddlewareFunction | Type<ErrorMiddlewareClass>;

/**
 * Create request middleware handler that uses class or function provided as middleware
 */
export function middlewareHandler(middleware: Middleware): RequestHandler {
    return (req, res, next) => {
        invokeMiddleware(middleware, [req, res, next]).catch(next);
    };
}

/**
 * Error Middleware class registration DI token
 */
export const ERROR_MIDDLEWARE = new InjectionToken('ERROR_MIDDLEWARE');
/**
 * Add error middleware to the app
 */
export function errorMiddlewareHandler(middleware?: ErrorMiddleware): ErrorRequestHandler {
    return (error, req, res, next) => {
        invokeMiddleware(middleware ? middleware : ERROR_MIDDLEWARE, [error, req, res, next]).catch(next);
    };
}









// INTERNAL
/**
 * Instantiate middleware and invoke it with arguments
 */
async function invokeMiddleware(middleware, args) {
    var _a;
    const next = args[args.length - 1];
    try {
        const instance = await getMiddlewareInstance(middleware);
        if (!instance) {
            return next();
        }
        const handler = (_a = instance === null || instance === void 0 ? void 0 : instance.use) !== null && _a !== void 0 ? _a : instance;
        const result = typeof handler === 'function' ? handler.apply(instance, args) : instance;
        if (result instanceof Promise) {
            result.catch(next);
        }
    }
    catch (err) {
        next(err);
    }
}


async function getMiddlewareInstance(middleware) {
    var _a;
    try {
        return await Container.get(middleware);
    }
    catch (_b) {
        if (typeof middleware === 'function') {
            return ((_a = middleware.prototype) === null || _a === void 0 ? void 0 : _a.use)
                ? new middleware()
                : middleware;
        }
        return null;
    }
}
