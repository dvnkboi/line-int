export class EventEmitter {

  private log = console;
  private handlerMap = new Map<string, Map<string, { once: boolean, handler: (...args: any[]) => void; }>>();

  public on(event: string, listener: (...args: any[]) => void, key?: string, override?: boolean) {
    key = key ?? Math.random().toString(36).substring(7);

    if (!this.handlerMap.has(event)) {
      this.handlerMap.set(event, new Map());
    }

    const map = this.handlerMap.get(event);

    if (map.has(key)) {
      this.log.warn('EventEmitter', `Event handler with key ${key} already exists for event ${event}`);
      if (!override) {
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

  public once(event: string, listener: (...args: any[]) => void, key?: string, override?: boolean) {
    key = key ?? Math.random().toString(36).substring(7);

    if (!this.handlerMap.has(event)) {
      this.handlerMap.set(event, new Map());
    }

    const map = this.handlerMap.get(event);

    if (map.has(key)) {
      this.log.warn('EventEmitter', `Event handler with key ${key} already exists for event ${event}`);
      if (!override) {
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

  public off(event: string, listenerOrKey: ((...args: any[]) => void) | string) {
    if (!this.handlerMap.has(event)) {
      return;
    }

    const map = this.handlerMap.get(event);

    if (typeof listenerOrKey === 'string') {
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

  public emit(event: string, ...args: any[]) {
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

  public removeAllListeners(event?: string) {
    if (event) {
      this.handlerMap.delete(event);
    }
    else {
      this.handlerMap.clear();
    }
  }

  public listenerCount(event: string) {
    if (!this.handlerMap.has(event)) {
      return 0;
    }

    return this.handlerMap.get(event).size;
  }

  public listeners(event: string) {
    if (!this.handlerMap.has(event)) {
      return [];
    }

    return Array.from(this.handlerMap.get(event).values());
  }

  public rawListeners(event: string) {
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