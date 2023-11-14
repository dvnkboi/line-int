import { Exception } from "../error/exception.js";
import { EventEmitter } from "./eventEmitter.js";
import { fetchEventSource } from "@microsoft/fetch-event-source";

const providers = {
  api: import.meta.env.VITE_SERVER_HOST + '/api',
};

export type EventType = 'events:audit' | 'window:online' | 'window:offline';

export type EventExeption = {
  secondaryMessage: string;
  status: number;
};

export type EventMessage<T> = {
  message: T;
};

export class Subscriber {
  private static events = new EventEmitter();
  private static streams: { [key: string]: () => void; } = {};

  public static on<T>(event: EventType, listener: (args: EventMessage<T | Exception<EventExeption>>) => void, key?: string) {
    this.events.on(event, listener, key);
  }

  public static off<T>(event: EventType, listener: ((args: EventMessage<T | Exception<EventExeption>>) => void) | string) {
    this.events.off(event, listener);
  }

  public static once<T>(event: EventType, listener: (args: EventMessage<T | Exception<EventExeption>>) => void, key?: string) {
    this.events.once(event, listener, key);
  }

  public static emit<T>(event: EventType, args: EventMessage<T | Exception<EventExeption>>) {
    this.events.emit(event, args);
  }

  public static subscribe(provider: keyof typeof providers, eventType: EventType) {
    //check if already exists
    if (this.streams[`${provider}:${eventType}`]) return;

    const abortController = new AbortController();
    const signal = abortController.signal;

    //use pagevisibility api to pause and resume
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.emit('window:online', {
          message: 'online'
        });
      } else {
        this.emit('window:offline', {
          message: 'offline'
        });
      }
    });

    fetchEventSource(`${providers[provider]}/${eventType.replace(/:/g, '/')}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: "text/event-stream",
      },
      onopen: async (res) => {
        if (res.ok && res.status === 200) {
        } else if (
          res.status >= 400 &&
          res.status < 500 &&
          res.status !== 429
        ) {
          Subscriber.emit(eventType, {
            message: new Exception('Connection error', 'connectionError', {
              secondaryMessage: 'Client error',
              status: res.status
            })
          });
        }
      },
      onmessage(event) {
        const parsedData = JSON.parse(event.data);
        Subscriber.emit(eventType, {
          message: parsedData
        });
      },
      onclose() {
        Subscriber.emit(eventType, {
          message: new Exception('Connection closed', 'connectionClosed', {
            secondaryMessage: 'Connection closed',
            status: 0
          })
        });
      },
      onerror(err) {
        Subscriber.emit(eventType, {
          message: new Exception('Connection error', 'connectionError', {
            secondaryMessage: err.message,
            status: 0
          })
        });
      },
      signal,
    });

    this.streams[`${eventType}`] = abortController.abort;
  }

  public static unsubscribe(provider: string, stream: string) {
    this.streams[`${provider}:${stream}`]();
    delete this.streams[`${provider}:${stream}`];
  }
}