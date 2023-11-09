import { EventEmitter } from "../events/index.js";
import { getCluster, isWorker } from "./threadManager.js";

type MessageEvent = {
  type: 'event',
  event: string,
  args: any[];
};

const createEventManager = () => {
  if (isWorker()) {

    const eventEmitter = new EventEmitter();

    const originalEmit = eventEmitter.emit.bind(eventEmitter);

    eventEmitter.emit = (event: string, ...args: any[]) => {
      //emit locally
      originalEmit(event, ...args);

      //send to primary
      const message: MessageEvent = {
        type: 'event',
        event,
        args,
      };
      process.send(message);
    };

    if (process.env.EVENTS_ENABLED_WORKER == 'true') {
      return eventEmitter;
    }

    process.env.EVENTS_ENABLED_WORKER = 'true';

    process.on('message', (message: MessageEvent) => {
      if (message.type == 'event') {
        originalEmit(message.event, ...message.args);
      }
    });

    return eventEmitter;
  }
  else {
    const cluster = getCluster();

    const eventEmitter = new EventEmitter();

    const originalEmit = eventEmitter.emit.bind(eventEmitter);

    eventEmitter.emit = (event: string, ...args: any[]) => {
      //emit locally
      originalEmit(event, ...args);

      //also broadcast to other workers
      const message: MessageEvent = {
        type: 'event',
        event,
        args,
      };
      for (const id in cluster.workers) {
        cluster.workers[id]?.send(message);
      }
    };

    if (process.env.EVENTS_ENABLED_PRIMARY == 'true') {
      return eventEmitter;
    }

    process.env.EVENTS_ENABLED_PRIMARY = 'true';

    cluster.on('message', (worker, message: MessageEvent) => {
      if (message.type == 'event') {
        eventEmitter.emit(message.event, ...message.args);
      }
    });

    return eventEmitter;
  }
};

export const eventManager = createEventManager();