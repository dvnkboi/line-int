import { RouterOptions } from "express";
import { Middleware } from "../middleware.js";
import { getMeta } from "../meta.js";

export function AttachMiddlware(...middleware: Middleware[]): ClassDecorator {
  return target => {
    const meta = getMeta(target.prototype);
    if (!meta.middleware) meta.middleware = [];
    if (!middleware) return;
    meta.middleware = [...meta.middleware, ...middleware];
  };
}