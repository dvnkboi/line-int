import { type NextFunction, type Request, type Response } from "express";
import { Container, Logger, tagSplitFileLog } from "../utils/index.js";
import { ILogOutput } from "../utils/log/iLogOutput.js";

export const requestLog = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const log = await Container.get<ILogOutput>(Logger);
    const { method, url, body, query } = req;
    const { statusCode } = res;

    // get accurate ip address
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const logMessage = `${ip} - [${method}] {${url}:${statusCode}} {body: ${JSON.stringify(body)}} {query: ${JSON.stringify(query)}}`;

    log.debug('server', logMessage);

    next();
  };
};