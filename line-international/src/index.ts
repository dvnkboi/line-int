import { serve } from "./server/server.js";
import { Initializer, env, Exception, Index, $mkdir, Logger, consoleLog, Container, Cache, ExpressApp, tagSplitFileLog, wait, stats, combineStats, globalEvents } from "./utils/index.js";
import { ILogOutput } from "./utils/log/iLogOutput.js";
import { eventManager } from "./utils/threading/events.js";
import { acquireLock, releaseLock } from "./utils/threading/locks.js";
import { State } from "./utils/threading/state.js";
import { getStats } from "./utils/threading/stats.js";
import { runOnPrimary, createWorkers, runOnWorker, isWorker, getWorker } from "./utils/threading/threadManager.js";

process.setMaxListeners(0);

const logProviders: ILogOutput[] = [];

if (env.log.type === 'file') {
  logProviders.push(tagSplitFileLog);
}
else if (env.log.type === 'console') {
  logProviders.push(consoleLog);
}
else if (env.log.type === 'combined') {
  logProviders.push(consoleLog, tagSplitFileLog);
}

const loggerWorkers = new Logger().setLogger(...logProviders);

const logger = await loggerWorkers;
globalEvents.setLoggers(logger);

logger.limit(Logger.MEGABYTE * 16);


runOnPrimary(async () => {

  await logger.info('server', 'Creating workers...');
  await createWorkers(env.server.workerCount, true);
  await State.set('allOnline', true);

  let to: NodeJS.Timeout;
  State.watch('finished', async (val, old) => {
    await logger.debug('finished', val, old);
    clearTimeout(to);
    to = setTimeout(async () => {
      await combineStats(await getStats(), logger);
      await logger.info('server', 'all workers online');
    }, 1000);
  });
});


runOnWorker(async () => {

  await wait(500);
  await acquireLock('init');
  const init = new Initializer();
  // await State.waitUntilValue('allOnline', true);

  init.addTask(
    async () => {
      await logger.info('initialization', 'Starting server...');
    },
    async () => {
      Container.provide([{
        provide: Logger,
        useValue: logger,
      }, {
        provide: Cache,
        useFactory: () => new Cache(),
      }, {
        provide: ExpressApp,
        useFactory: () => new ExpressApp(logger),
      }]);
    },
    async () => {
      if (isWorker(1)) await $mkdir(env.server.storagePath);
    },
    async () => {
      await logger.info('initialization', `Storage path created at ${env.server.storagePath}`);
    },
    async () => {
      await logger.info('initialization', 'Initializing index...');
    },
    async () => await Index.init(),
    async () => serve(logger),
    async () => {
      await logger.info('initialization', 'Server started');
    }
  );
  await init.run();
  await wait(500);
  await releaseLock('init');
});