import express, { type ErrorRequestHandler, type IRouter, Router } from "express";
import { attachControllerInstances, attachControllers } from "./express.js";
import { errorMiddlewareHandler, middlewareHandler } from "./middleware.js";
import type { Middleware, ErrorMiddleware } from "./middleware.js";
import { IncomingMessage, Server, ServerResponse } from "http";
import { getMeta, type ExpressMeta } from "./meta.js";
import helmet, { HelmetOptions } from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from "../env/index.js";
import { Exception } from "../error/exception.js";
import { Logger } from "../index.js";
import { Injectable } from "@decorators/di";
import { isWorker } from "../threading/threadManager.js";
import { getAllMethodNames } from "../debug/methods.js";

@Injectable()
export class ExpressApp {
  private classMap = new Map<string, any>();
  private instanceMap = new Map<string, any>();
  private meta = new Map<string, ExpressMeta>();
  private baseRoute = '';
  private helmetOptions: HelmetOptions = {
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  };
  private cookieParserOptions: cookieParser.CookieParseOptions = {};
  private middleware: Middleware[] = [];
  private errorMiddleware: ErrorRequestHandler = errorMiddlewareHandler();
  private static discoveredControllers: (Type<any> | any)[] = [];

  private app = express();
  private log: Logger;

  constructor (log?: Logger) {
    this.log = log;
  }

  private isClassDefinition(classDefinition: any): classDefinition is Type<any> {
    //check if argument is a class definition or instance
    return typeof classDefinition === 'function';
  }

  private attachController(classDefinition: Type<any>) {
    if (!classDefinition) throw new Error('Controller is not defined');
    this.classMap.set(classDefinition.name, classDefinition);
    return this;
  }

  private attachInstance(instance: any) {
    if (!instance) throw new Error('Controller is not defined');
    this.instanceMap.set(instance.constructor.name, instance);
    return this;
  }

  public attach(classDefinition: Type<any> | any) {
    if (this.isClassDefinition(classDefinition)) {
      this.log.info('SERVER', `attaching controller ${classDefinition.name}`);
      return this.attachController(classDefinition);
    } else {
      this.log.info('SERVER', `attaching controller ${classDefinition.constructor.name}`);
      return this.attachInstance(classDefinition);
    }
  }

  public static formatRouteString(route: string) {
    if (!route) return '';
    // remove all double slashes
    route = route.replace(/\/{2,}/g, '/');
    // remove trailing slash
    route = route.replace(/\/$/, '');
    // add leading slash if not present
    route = route.startsWith('/') ? route : `/${route}`;
    return route;
  }

  public static joinRoute(...routes: string[]) {
    const route = routes.map(r => this.formatRouteString(r)).join('');
    // remove all double slashes
    return route.replace(/\/{2,}/g, '/');
  }

  public static getDiscoveredControllers() {
    return this.discoveredControllers;
  }

  public static removeDiscoveredController(controller: Type<any> | any) {
    this.discoveredControllers = this.discoveredControllers.filter(c => c !== controller);
  }

  public static pushDiscoveredController(controller: Type<any> | any) {
    this.discoveredControllers.push(controller);
  }

  public static clearDiscoveredControllers() {
    this.discoveredControllers = [];
  }

  private async attachToApp() {
    const classControllers = Array.from(this.classMap.values());
    const instanceControllers = Array.from(this.instanceMap.values());

    const appMeta = await attachControllers(classControllers);
    const appMetaInstances = await attachControllerInstances(instanceControllers);


    for (const appMetaInstance of appMetaInstances) { // push 
      appMeta.push(appMetaInstance);
    }

    this.meta = new Map(appMeta.map(m => [m.meta.url, m.meta]));

    for (const m of this.middleware) { // attach all middleware
      this.app.use(middlewareHandler(m));
    }

    this.use(cookieParser(env.server.cookieSecret, this.cookieParserOptions));
    this.use(helmet(this.helmetOptions));

    for (const metaObj of appMeta) { // attach all routers
      if (metaObj.router) {
        this.app.use(ExpressApp.joinRoute(this.baseRoute, metaObj.meta.url), metaObj.router);
      }
    }

    this.log.debug('SERVER', `attaching middleware 404 error`);
    this.app.use('*', (req, res) => {
      res.status(404).send(new Exception('Route not found', 'routeException', {
        status: 404,
        url: req.url,
        method: req.method,
      }));
    });

    this.log.debug('SERVER', `attaching error middleware handler`);
    this.app.use(this.errorMiddleware); // error middleware must be last

    return this.app;
  }

  public getMeta() {
    if (this.meta.size === 0) return null;
    return this.meta;
  }

  public printMeta() {
    const meta = this.meta;
    for (const [key, value] of meta) {
      const { routes, url, type, middleware } = value;
      this.log.info('SERVER', `registering Controller: ${url} [${type}]`);
      this.log.info('SERVER', `---------------------Routes---------------------`);
      for (const classMethod of Object.keys(routes)) {
        this.log.info('SERVER', `  registering method ${classMethod}`);
        for (const route of routes[classMethod].routes) {
          this.log.info('SERVER', `    |_registering route: ${route.url} [method:${route.method}] ${route.middleware.length > 0 ? `[middlewares:${route.middleware}]` : ''}`);
        }
      }
      this.log.info('SERVER', '\n');
    }
  }

  public setBaseRoute(baseRoute: string) {
    this.log.debug('SERVER', `setting base route to ${baseRoute}`);
    this.baseRoute = baseRoute;
    return this;
  }

  public setHelmetOptions(options: HelmetOptions) {
    this.helmetOptions = options;
    return this;
  }

  // express functions 
  // TODO , check if they work
  public use(...middleware: Middleware[]) {
    for (const m of middleware) {
      if (m.name) this.log.debug('SERVER', `attaching middleware ${m.name}`);
    }
    this.middleware.push(...middleware);
    return this;
  }



  public get(path: string, ...middleware: Middleware[]) {
    this.app.get(path, ...middleware.map(m => middlewareHandler(m)));
    return this;
  }

  public post(path: string, ...middleware: Middleware[]) {
    this.app.post(path, ...middleware.map(m => middlewareHandler(m)));
    return this;
  }

  public put(path: string, ...middleware: Middleware[]) {
    this.app.put(path, ...middleware.map(m => middlewareHandler(m)));
    return this;
  }

  public delete(path: string, ...middleware: Middleware[]) {
    this.app.delete(path, ...middleware.map(m => middlewareHandler(m)));
    return this;
  }

  public patch(path: string, ...middleware: Middleware[]) {
    this.app.patch(path, ...middleware.map(m => middlewareHandler(m)));
    return this;
  }

  public options(path: string, ...middleware: Middleware[]) {
    this.app.options(path, ...middleware.map(m => middlewareHandler(m)));
    return this;
  }

  public head(path: string, ...middleware: Middleware[]) {
    this.app.head(path, ...middleware.map(m => middlewareHandler(m)));
    return this;
  }

  public connect(path: string, ...middleware: Middleware[]) {
    this.app.connect(path, ...middleware.map(m => middlewareHandler(m)));
    return this;
  }

  public trace(path: string, ...middleware: Middleware[]) {
    this.app.trace(path, ...middleware.map(m => middlewareHandler(m)));
    return this;
  }

  public all(path: string, ...middleware: Middleware[]) {
    this.app.all(path, ...middleware.map(m => middlewareHandler(m)));
    return this;
  }

  public route(path: string) {
    return this.app.route(path);
  }

  public param(name: string, handler: Middleware) {
    this.app.param(name, middlewareHandler(handler));
    return this;
  }

  public useError(handler: ErrorMiddleware) {
    this.errorMiddleware = errorMiddlewareHandler(handler);
    return this;
  }

  public set(setting: string, val: any) {
    this.app.set(setting, val);
    return this;
  }

  public getSetting(setting: string) {
    return this.app.get(setting);
  }

  public enable(setting: string) {
    this.app.enable(setting);
    return this;
  }

  public disable(setting: string) {
    this.app.disable(setting);
    return this;
  }

  public enabled(setting: string) {
    return this.app.enabled(setting);
  }

  public disabled(setting: string) {
    return this.app.disabled(setting);
  }

  public engine(ext: string, fn: (path: string, options: object, callback: (e: any, rendered?: string) => void) => void) {
    this.app.engine(ext, fn);
    return this;
  }

  public path() {
    return this.app.path();
  }

  private async tryPort(port: number) {
    return new Promise((resolve, reject) => {
      const srv = this.app.listen(port, () => {
        srv.close();
        resolve(true);
      });
      srv.once('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * this async function resolves when the app is listening on the port
   * can be used like so:  
   * ```ts
   *   const app = new ExpressApp();
   *   await app.listen(3000);
   *   console.log('listening on port 3000');  
   *   // or  
   *   await app.listen('3000:loose');
   *   console.log('listening on port 3000');  
   *   // or  
   *   app.listen(3000, (port) => {
   *      console.log(`listening on port ${port}`);
   *   });  
   * ```
   *
   * loose and force modes:
   *   - loose mode will try to listen on the port, if it fails it will try to listen on the next port
   *   - force mode will try to listen on the port, if it fails it will throw an error
   *   
   * @param port  port number or port number with mode (loose or force)
   * @param callback callback function that will be called when the app is listening on the port
   * @returns promise to an HTTP Server instance
   */
  public async listen(port: number | `${number}:${'loose' | 'force'}`, callback?: (port: number) => void): Promise<Server<typeof IncomingMessage, typeof ServerResponse>> {
    let portNumber = 0;

    this.log.info('SERVER', `Starting server on port ${port}, starting port discovery...`);

    if (typeof port === 'string') {

      const strArr = port.split(':');
      const mode = strArr[1];
      portNumber = parseInt(strArr[0]);
      if (mode === 'loose') {
        this.log.warn('SERVER', `loose mode enabled, do not use in production`);
        while (await this.tryPort(portNumber) === false) {
          portNumber++;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    else {
      portNumber = port;
    }

    this.log.info('SERVER', `free port found: ${portNumber}`);

    return new Promise((resolve, reject) => {
      this.attachToApp().then(app => {
        try {
          const server = app.listen(portNumber, () => {
            if (callback) callback(portNumber);
            resolve(server);
            this.log.info('SERVER', `Server started on port ${portNumber}`);
          });
        }
        catch (err) {
          reject(err);
        }
      });
    });
  }
}