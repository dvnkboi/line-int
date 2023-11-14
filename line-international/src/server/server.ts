import { json } from "express";
import { requestLog } from "../middleware/log.js";
import { errorMiddleware } from "../middleware/error.js";
import cors from "cors";
import { Container, ExpressApp, Logger, env } from "../utils/index.js";
import { EventStream } from "../controllers/eventStream.js";
import { FileController } from "../controllers/fileController.js";
import fileMiddleware from 'express-fileupload';
import { Healthcheck } from "../controllers/health.js";
import { isWorker } from "../utils/threading/threadManager.js";
import { LogController } from "../controllers/logsController.js";

const serverEnv = env.server;

//strip apiHost and webHost from http:// or https://
const apiHost = serverEnv.apiHost.replace(/(^\w+:|^)\/\//, '');
const webHost = serverEnv.webHost.replace(/(^\w+:|^)\/\//, '');

export const serve = async (logger: Logger) => {

  const corsHosts = [`http://${apiHost}`, `https://${apiHost}`, `http://${webHost}`, `https://${webHost}`, 'http://localhost'];
  const app = (await Container.get<ExpressApp>(ExpressApp))
    .setBaseRoute('/api')
    .use(cors({
      credentials: true,
      origin: corsHosts,
      optionsSuccessStatus: 200
    }))
    .use(requestLog())
    .use(json())
    .use(fileMiddleware({
      createParentPath: true,
      limits: { fileSize: 1000 * 1024 * 1024 }, // 1GB max file(s) size,
      safeFileNames: false,
      parseNested: false
    }))
    .attach(FileController)
    .attach(new EventStream(logger))
    .attach(Healthcheck)
    .attach(new LogController(logger))
    .useError(errorMiddleware());

  await app.listen(`${serverEnv.port}:${env.server.env == 'development' ? 'loose' : 'force'}`, () => {
    if (isWorker(1) || isWorker(0)) app.printMeta();
  });
};