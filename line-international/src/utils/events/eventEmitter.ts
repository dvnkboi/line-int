import { Logger } from "../index.js";

export class EventEmitter<T extends string = string> {

  setLoggers(log: Console | Logger) {
    this.log = log;
  }

  private log: Logger | Console = console;
  private handlerMap = new Map<string, Map<string, { once: boolean, handler: (...args: any[]) => void; }>>();

  constructor () {
    this.handlerMap = new Map<string, Map<string, { once: boolean, handler: (...args: any[]) => void; }>>();
    this.log = console;
  }

  public on(event: T, listener: (...args: any[]) => void, key?: string, override?: boolean) {
    key = key ?? Math.random().toString(36).substring(7);

    if (!this.handlerMap.has(event)) {
      this.handlerMap.set(event, new Map());
    }

    const map = this.handlerMap.get(event);

    if (map.has(key)) {
      this.log.warn('EventEmitter', `Event handler with key ${key} already exists for event ${event}`);
      if (override) {
        map.set(key, {
          once: false,
          handler: listener
        });
      }
    }
    else {
      map.set(key, {
        once: false,
        handler: listener
      });
    }

    return key;
  }

  public once(event: T, listener: (...args: any[]) => void, key?: string, override?: boolean) {
    key = key ?? Math.random().toString(36).substring(7);

    if (!this.handlerMap.has(event)) {
      this.handlerMap.set(event, new Map());
    }

    const map = this.handlerMap.get(event);

    if (map.has(key)) {
      this.log.warn('EventEmitter', `Event handler with key ${key} already exists for event ${event}`);
      if (override) {
        map.set(key, {
          once: true,
          handler: listener
        });
      }
    }
    else {
      map.set(key, {
        once: true,
        handler: listener
      });
    }

    return key;
  }

  public off(event: T, listenerOrKey: ((...args: any[]) => void) | string) {
    if (!this.handlerMap.has(event)) {
      return;
    }

    const map = this.handlerMap.get(event);

    if (typeof listenerOrKey === 'string') {
      console.log('deleting', listenerOrKey);
      map.delete(listenerOrKey);
    }
    else {
      for (const [key, value] of map) {
        if (value.handler === listenerOrKey) {
          map.delete(key);
          break;
        }
      }
    }
  }

  public emit(event: T, ...args: any[]) {
    if (!this.handlerMap.has(event)) {
      return;
    }

    const map = this.handlerMap.get(event);

    for (const [key, value] of map) {
      value.handler(...args);
      if (value.once) {
        map.delete(key);
      }
    }
  }

  public removeAllListeners(event?: T) {
    if (event) {
      this.handlerMap.delete(event);
    }
    else {
      this.handlerMap.clear();
    }
  }

  public listenerCount(event: T) {
    if (!this.handlerMap.has(event)) {
      return 0;
    }

    return this.handlerMap.get(event).size;
  }

  public listeners(event: T) {
    if (!this.handlerMap.has(event)) {
      return [];
    }

    return Array.from(this.handlerMap.get(event).values());
  }

  public rawListeners(event: T) {
    if (!this.handlerMap.has(event)) {
      return [];
    }

    return Array.from(this.handlerMap.get(event).values()).map(x => x.handler);
  }

  public eventNames() {
    return Array.from(this.handlerMap.keys());
  }
}

export const globalEvents = new EventEmitter();