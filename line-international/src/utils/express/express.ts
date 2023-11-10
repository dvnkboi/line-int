import { errorMiddlewareHandler, middlewareHandler, type MiddlewareFunction, type Type } from "./middleware.js";
import { getMeta, type ParameterConfiguration, ParameterType, setMeta } from "./meta.js";
import { Router, type Express, type Request, type Response, type NextFunction, type Application } from "express";
import { Container } from "../DI/index.js";
import { type QueueType, EventIterator } from "../events/index.js";
import { useObjectlessReplacer } from "../generators/json.js";

/**
 * Attach controllers to express application
 */
export async function attachControllers(controllers: Type[]) {
    const promises = controllers.map((controller) => registerController(controller, getController));
    const controllerInstances = await Promise.all(promises);
    return controllerInstances;
}
/**
 * Attach controller instances to express application
 */
export async function attachControllerInstances(controllers: InstanceType<Type>[]) {
    const promises = controllers.map((controller) => registerController(controller, (c) => c));
    const controllerInstances = await Promise.all(promises);
    return controllerInstances;
}
/**
 * Register controller via registering new Router
 */
async function registerController(Controller, extractController: (c: Type) => any) {
    const controller = await extractController(Controller);
    const meta = getMeta(controller);

    // console.log(`registering ${meta.type} ${meta.url} from ${controller.constructor.name}`, meta);

    const router = Router(meta.routerOptions);

    /**
     * Wrap all registered middleware with helper function
     * that can instantiate or get from the container instance of the class
     * or execute given middleware function
     */
    const routerMiddleware = (meta.middleware || [])
        .map(middleware => middlewareHandler(middleware));
    /**
     * Apply router middleware
     */
    if (routerMiddleware.length) {
        router.use(...routerMiddleware);
    }
    /**
     * Applying registered routes
     */
    if (meta.type === 'controller') {
        for (const [methodName, methodMeta] of Object.entries(meta.routes)) {
            methodMeta.routes.forEach(route => {
                const routeMiddleware = (route.middleware || [])
                    .map(middleware => middlewareHandler(middleware));
                const handler = controllerRouteHandler(controller, methodName, meta.params[methodName], methodMeta.status);
                router[route.method].apply(router, [
                    route.url, ...routeMiddleware, handler,
                ]);
                // console.log(`registered ${route.method} ${route.url} for ${methodName} from ${controller.constructor.name}`);
            });
        }
    }
    else if (meta.type === 'stream') {
        for (const [methodName, methodMeta] of Object.entries(meta.routes)) {
            methodMeta.routes.forEach(route => {
                const routeMiddleware = (route.middleware || [])
                    .map(middleware => middlewareHandler(middleware));
                const handler = streamRouteHandler(controller, methodName, meta.params[methodName], methodMeta.status);
                router[route.method].apply(router, [
                    route.url, ...routeMiddleware, handler,
                ]);
                // console.log(`registered ${route.method} ${route.url} for ${methodName} from ${controller.constructor.name}`);
            });
        }
    }

    return {
        controller,
        router,
        meta
    };
}
/**
 * Returns function that will call original route handler and wrap return options
 */
function controllerRouteHandler(controller, methodName, params, status) {
    return (req: Request, res: Response, next: NextFunction) => {
        const args = extractParameters(req, res, next, params);
        try {
            const result = controller[methodName].call(controller, ...args);
            if (result instanceof Promise) {
                result.then((r) => {
                    if (!res.headersSent && typeof r !== 'undefined') {
                        if (status) {
                            res.status(status);
                        }
                        res.send(r);
                    }
                }).catch((err) => {
                    console.log(err);
                    next(err);
                });
            }
            else if (typeof result !== 'undefined') {
                if (!res.headersSent) {
                    if (status) {
                        res.status(status);
                    }
                    res.send(result);
                }
            }
            return result;
        }
        catch (e) {
            console.log(e);
            next(e);
        }
    };
}
const GeneratorFunction = (function* () { }).constructor;
const AsyncGeneratorFunction = (async function* () { }).constructor;
const isAsyncGeneratorFunction = (fn) => fn instanceof AsyncGeneratorFunction || fn instanceof EventIterator;
const isGeneratorFunction = (fn) => fn instanceof GeneratorFunction || isAsyncGeneratorFunction(fn);

/**
 * Returns function that will call original route handler and wrap return options
 */
function streamRouteHandler(controller: InstanceType<Type>, methodName, params, status) {
    return async (req: Request, res: Response, next: NextFunction) => {
        res.writeHead(200, {
            "Connection": "keep-alive",
            "Cache-Control": "no-cache",
            "Content-Type": "text/event-stream",
        });

        const args = extractParameters(req, res, next, params);

        res.once('close', () => {
            res.end();
        });

        try {
            for await (const result of await controller[methodName].call(controller, ...args)) {
                try {
                    if (res.closed || res.writableEnded) break;
                    const awaitedResult = result instanceof Promise ? await result : result;
                    if (status) {
                        res.status(status);
                    }
                    if (awaitedResult == null) {
                        continue;
                    }
                    res.write(`data: ${JSON.stringify(awaitedResult)}\n\n`);
                } catch (e) {
                    console.log(e);
                }
            }
        }
        catch (e) {
            if (!isGeneratorFunction(controller[methodName])) {
                console.warn(`check to see if Controller ${controller.constructor.name} method ${methodName} is a generator function failed, maybe you forgot to yield values instead of returning them?`);
                console.error(e);
            }
            res.end();
        }

        setTimeout(() => {
            res.end();
        }, 5000);
    };
};

/**
 * Extract parameters for handlers
 */
function extractParameters(req, res, next, params: ParameterConfiguration[] = []) {
    const args = [];
    for (const { name, index, type, data } of params) {
        switch (type) {
            case ParameterType.RESPONSE:
                args[index] = res;
                break;
            case ParameterType.REQUEST:
                args[index] = getParam(req, null, name);
                break;
            case ParameterType.NEXT:
                args[index] = next;
                break;
            case ParameterType.PARAMS:
                args[index] = getParam(req, 'params', name);
                break;
            case ParameterType.QUERY:
                args[index] = getParam(req, 'query', name);
                break;
            case ParameterType.BODY:
                args[index] = getParam(req, 'body', name);
                break;
            case ParameterType.HEADERS:
                args[index] = getParam(req, 'headers', name);
                break;
            case ParameterType.COOKIES:
                args[index] = getParam(req, 'cookies', name);
                break;
            case ParameterType.QUEUE:
                new EventIterator((queue) => {
                    args[index] = queue;
                });
                break;
            case ParameterType.AUTH:
                const authHeader = getParam(req, 'headers', 'authorization');
                //Basic dGVzdDpwYXNzd29yZA==
                if (name == 'basic') {
                    const auth = Buffer.from(authHeader as string ?? 'Basic ', 'base64').toString('ascii');
                    const [username, password] = auth.split(' ')[1].split(':');
                    args[index] = !password ? null : {
                        username,
                        password
                    };
                }
                if (name == 'bearer') {
                    const auth = Buffer.from(authHeader as string ?? 'Basic ', 'base64').toString('ascii');
                    const token = auth.split(' ')[1];
                    if (token.length < 1) args[index] = token;
                    args[index] = null;
                }
                break;
            case ParameterType.DEFAULT:
                args[index] = data;
                break;
        }
    }
    return args;
}
/**
 * Get controller instance from container or instantiate one
 */
async function getController(Controller) {
    try {
        return await Container.get(Controller);
    }
    catch (_a) {
        return new Controller();
    }
}
/**
 * Get parameter value from the source object
 */
function getParam(source, paramType, name) {
    const param = source[paramType] || source;
    return name ? param[name] : param;
}
/**
 * Attach middleware to controller metadata
 *
 * @param {boolean} unshift if set to false all the custom decorator middlewares will be exectuted after the middlewares attached through controller
 *
 * Note- Please use custom decorators before express method decorators Get Post etc.
 */
export function attachMiddleware(target: any, property: string, middleware: MiddlewareFunction): void {
    const meta = getMeta(target);
    if (meta.url !== '') {
        meta.middleware.unshift(middleware);
    }
    else if (property in meta.routes) {
        meta.routes[property].routes[0].middleware.unshift(middleware);
    }
    setMeta(target, meta);
}