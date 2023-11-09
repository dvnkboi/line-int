import { Worker as OriginalWorker, isMainThread, parentPort } from 'worker_threads';
import { EventEmitter } from '../events/index.js';

const workers = new Map<string, { worker: OriginalWorker[]; current: number; }>();

const roundRobin = (key: string) => {
  const workerObject = workers.get(key);
  if (!workerObject) return;
  const { current } = workerObject;
  const { length } = workerObject.worker;
  workerObject.current = (current + 1) % length;
  return workerObject.worker[current];
};

const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const Worker = (url: string = import.meta.url, workerCount: number = 1) => {
  return (target: any) => {
    const fileName = cleanUpFilename(url);

    if (isMainThread) {
      const events = new EventEmitter();

      overLoadClassMethods(target, fileName, events);

      // create a new worker from the class
      workers.set(fileName, {
        worker: [],
        current: 0
      });

      createWorkers(workerCount, events, fileName);

      return target;
    }
    else {
      workerHandler(target);
    }
  };
};


const overLoadClassMethods = (target: any, fileName: string, events: EventEmitter) => {
  const methods = Object.getOwnPropertyNames(target.prototype).filter((method) => method !== 'constructor');

  for (const method of methods) {
    const originalMethod = target.prototype[method];
    if (typeof originalMethod !== 'function') continue;

    target.prototype[method] = (...args: any[]) => {
      const worker = roundRobin(fileName);
      const id = generateId();
      return new Promise((resolve, reject) => {
        worker.postMessage({
          id,
          method,
          args
        });
        events.once(method + id, resolve);
      });
    };
  }
};

const cleanUpFilename = (fileName: string) => {
  return fileName.startsWith('file://') ? decodeURI(new URL('', fileName).pathname.replace(/\\/g, '/').substring(1)) : fileName;
};

const createWorkers = (workerCount: number, events: EventEmitter, fileName: string) => {
  for (let i = 0; i < workerCount; i++) {
    const worker = new OriginalWorker(fileName);

    worker.on('message', (event) => {
      const { method, result, id } = event;
      events.emit(method + id, result);
    });

    worker.on('error', (error) => {
      console.error(error);
    });

    worker.on('exit', () => {
      console.log('worker exited');
    });

    workers.get(fileName)?.worker.push(worker);
  }
};

const workerHandler = (target: any) => {
  parentPort.on('message', async (event) => {
    const { method, args, id } = event;
    const originalMethod: Function = target.prototype[method].bind(target.prototype);
    const result = await originalMethod(...args);
    parentPort.postMessage({
      id,
      method,
      result
    });
  });
};