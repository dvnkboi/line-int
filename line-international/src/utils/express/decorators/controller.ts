import { RouterOptions } from "express";
import { getMeta, setMeta } from "../meta.js";
import { Middleware } from "../middleware.js";
import { ExpressApp } from "../registry.js";

const ControllerBuilder = (type: 'controller' | 'stream') => {
    return (url: string, middlewareOrRouterOptions?: RouterOptions | Middleware[], middleware: Middleware[] = []): ClassDecorator => {
        return target => {
            const meta = getMeta(target.prototype);
            meta.url = url;
            meta.routerOptions = Array.isArray(middlewareOrRouterOptions) ? null : middlewareOrRouterOptions;
            if (!meta.middleware) meta.middleware = [];
            meta.middleware = [...meta.middleware, ...(Array.isArray(middlewareOrRouterOptions) ? middlewareOrRouterOptions : middleware)];
            meta.type = type;
            setMeta(target.prototype, meta);
            ExpressApp.pushDiscoveredController(target);
            return target;
        };
    };
};


export const Controller = (url: string, middlewareOrRouterOptions?: RouterOptions | Middleware[], middleware: Middleware[] = []) =>
    ControllerBuilder('controller')(url, middlewareOrRouterOptions, middleware);

export const Stream = (url: string, middlewareOrRouterOptions?: RouterOptions | Middleware[], middleware: Middleware[] = []) =>
    ControllerBuilder('stream')(url, middlewareOrRouterOptions, middleware);