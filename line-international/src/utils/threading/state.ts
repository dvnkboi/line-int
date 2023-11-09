import { Hash } from "../hashing/index.js";
import { EventEmitter } from "../events/eventEmitter.js";
import { getCluster, isWorker } from "./threadManager.js";

type StateManager = {
  set: <T = any>(key: string, value?: T) => Promise<void>;
  get: <T = any>(key?: string) => Promise<T>;
  waitUntilValue: <T = any>(key: string, value?: T) => Promise<void>;
  waitUntilCb: <T = any>(key: string, cb: (val: T) => boolean) => Promise<void>;
  remove: (key: string) => Promise<void>;
  has: (key: string) => Promise<boolean>;
  watch: <T = any>(key: string, cb: (val: T, old: T) => void | Promise<void>) => () => void;
  events: EventEmitter<'stateMutation'>;
};

const defaultMethods: StateManager = {
  set: async (key: string, value?: any): Promise<void> => { },
  get: async <T = any>(key?: string): Promise<T> => null,
  waitUntilValue: async <T = any>(key: string, value?: T): Promise<void> => { },
  waitUntilCb: async <T = any>(key: string, cb: (val: T) => boolean): Promise<void> => { },
  remove: async (key: string): Promise<void> => { },
  has: async (key: string): Promise<boolean> => false,
  events: new EventEmitter<'stateMutation'>(),
  watch: (key: string, cb: (val: any, old: any) => void) => () => { }
};

const createStateManager = (): StateManager => {
  if (isWorker()) { // if on worker
    if (process.env.STATE_ENABLED_WORKER == 'true') {
      return defaultMethods;
    }
    process.env.STATE_ENABLED_WORKER == 'true';


    // event handler
    const events = new EventEmitter<'stateMutation'>();


    // state management
    const set = async (key: string, value?: any): Promise<void> => { // send a setState to main thread, await respinse and send confirmation
      return new Promise((res) => {
        const handler = (message: any) => {
          if (message.type == 'setState_return') {
            process.off('message', handler);
            process.send({
              type: 'setState_complete',
              key
            });
            res();
          }
        };
        process.on('message', handler);
        process.send({
          type: 'setState',
          key,
          value
        });
      });
    };

    const get = async <T = any>(key?: string): Promise<T> => {
      return new Promise((res) => {
        const handler = (message: any) => {
          if (message.type == 'getState_return') {
            res(message.value);
            process.off('message', handler);
          }
        };
        process.on('message', handler);
        process.send({
          type: 'getState',
          key
        });
      });
    };

    const waitUntilValue = async <T = any>(key: string, value?: T): Promise<void> => {
      return new Promise(async (res) => {
        if (await get(key) == value) {
          res();
          return;
        }
        const handler = (k, v) => {
          if (k == key && v == value) {
            res();
            events.off('stateMutation', handler);
          }
        };
        events.on('stateMutation', handler);
      });
    };

    const waitUntilCb = async <T = any>(key: string, cb: (val: T) => boolean): Promise<void> => {
      return new Promise(async (res) => {
        const val = await get(key);
        if (cb(val)) {
          res();
          return;
        }
        const handler = (k, v) => {
          if (k == key && cb(v)) {
            res();
            events.off('stateMutation', handler);
          }
        };
        events.on('stateMutation', handler);
      });
    };

    const watch = <T = any>(key: string, cb: (val?: T, old?: T) => Promise<void> | void) => {
      const handler = (k, v, o) => {
        if (k == key) {
          cb(v, o);
        }
      };
      events.on('stateMutation', handler);
      const unwatch = () => {
        events.off('stateMutation', handler);
      };
      return unwatch;
    };

    const remove = async (key: string): Promise<void> => {
      return await set(key);
    };

    const has = async (key: string): Promise<boolean> => {
      return (await get(key)) != undefined;
    };


    // event handler for stateMutations
    process.on('message', (message: any) => {
      if (message.type == 'stateMutation') {
        events.emit('stateMutation', message.key, message.value, message.old);
      }
    });


    //overwrite state methods
    defaultMethods.events = events;
    defaultMethods.set = set;
    defaultMethods.get = get;
    defaultMethods.waitUntilValue = waitUntilValue;
    defaultMethods.waitUntilCb = waitUntilCb;
    defaultMethods.remove = remove;
    defaultMethods.has = has;
    defaultMethods.watch = watch;


    return {
      set,
      get,
      waitUntilValue,
      waitUntilCb,
      remove,
      has,
      watch,
      events
    } satisfies StateManager;
  }
  else { // if on main thread
    if (process.env.STATE_ENABLED_MAIN == 'true') {
      return defaultMethods;
    }
    process.env.STATE_ENABLED_MAIN = 'true';

    // getting worker cluster
    const cluster = getCluster();


    // centralized state object (on primary worker)
    const state = new Hash();


    // event handler
    const events = new EventEmitter<'stateMutation' | 'stateLock' | 'stateUnlock'>();


    // state write lock
    let settingState = false;
    const lockState = () => {
      settingState = true;
      events.emit('stateLock');
    };

    const unlockState = () => {
      settingState = false;
      events.emit('stateUnlock');
    };

    // util to wait until state is unlocked
    const waitUntilEvent = (event: 'stateLock' | 'stateUnlock'): Promise<void> => {
      return new Promise((res) => {
        events.once(event, () => {
          res();
        });
      });
    };


    // message handler for state mutations/gets from workers
    cluster.on('message', async (worker, message: any) => {
      if (message.type == 'setState') { // set state
        await set(message.key, message.value);
        worker.send({
          type: 'setState_return',
          key: message.key
        });
      }
      else if (message.type == 'getState') { // get state with lock check
        if (settingState) {
          await waitUntilEvent('stateUnlock');
        }
        worker.send({
          type: 'getState_return',
          key: message.key,
          value: message.key ? state.get(message.key) : state
        });
      }
      // else if (message.type == 'setState_complete') { // unlock state after set complete (could be removed idk yet)
      //   unlockState();
      // }
    });


    // state manager methods
    const set = async <T = any>(key: string, value?: T): Promise<void> => {
      if (settingState) {
        await waitUntilEvent('stateUnlock');
      }
      lockState();
      const old = state.get(key);
      if (value == undefined) {
        state.delete(key);
      }
      else {
        state.set(key, value);
      }
      for (const id in cluster.workers) {
        cluster.workers[id]?.send({
          type: 'stateMutation',
          key,
          value,
          old
        });
      }
      events.emit('stateMutation', key, value, old);
      if (!isWorker()) {
        unlockState();
      }
    };

    const get = async <T = any>(key?: string): Promise<T> => {
      return state.get(key);
    };

    const waitUntilValue = async <T = any>(key: string, value: T): Promise<void> => {
      return new Promise(async (res) => {
        if (await get(key) == value) {
          res();
          return;
        }

        const handler = (k, v) => {
          if (k == key && v == value) {
            res();
            events.off('stateMutation', handler);
          }
        };

        events.on('stateMutation', handler);
      });
    };

    const waitUntilCb = async <T = any>(key: string, cb: (val: T) => boolean): Promise<void> => {
      return new Promise(async (res) => {
        const val = await get(key);
        if (cb(val)) {
          res();
          return;
        }
        const handler = (k, v) => {
          if (k == key && cb(v)) {
            res();
            events.off('stateMutation', handler);
          }
        };
        events.on('stateMutation', handler);
      });
    };

    const watch = <T = any>(key: string, cb: (val?: T, old?: T) => Promise<void> | void) => {
      const handler = (k, v, o) => {
        if (k == key) {
          cb(v, o);
        }
      };
      events.on('stateMutation', handler);
      const unwatch = () => {
        events.off('stateMutation', handler);
      };
      return unwatch;
    };

    const remove = async (key: string): Promise<void> => {
      return await set(key);
    };

    const has = async (key: string): Promise<boolean> => {
      return (await get(key)) != undefined;
    };


    // overwrite state methods
    defaultMethods.events = events;
    defaultMethods.set = set;
    defaultMethods.get = get;
    defaultMethods.waitUntilValue = waitUntilValue;
    defaultMethods.waitUntilCb = waitUntilCb;
    defaultMethods.remove = remove;
    defaultMethods.has = has;
    defaultMethods.watch = watch;

    return {
      set,
      get,
      waitUntilValue,
      waitUntilCb,
      remove,
      watch,
      has,
      events,
    } satisfies StateManager;
  }
};

export const State = createStateManager();