import { Exception } from "../error/exception.js";

//https://www.npmjs.com/package/event-iterator
type QueueEvent = keyof EventHandlers;
type RemoveHandler = () => void;
type ListenHandler<T> = (queue: QueueType<T>) => void | RemoveHandler;

interface EventIteratorOptions {
  highWaterMark: number | undefined;
  lowWaterMark: number | undefined;
}

export type ErrorStream = Exception<{ status: number; }>;

export interface QueueType<T> {
  push(value: T): void;
  stop(): void;
  fail(error: Error): void;
  on<E extends QueueEvent>(event: E, fn: EventHandlers[E]): void;
  setRemoveCb: (removeHandler: RemoveHandler) => void;
  [Symbol.asyncIterator]: () => AsyncIterator<T>;
  errorIterator: (message: ErrorStream) => ErrorIterator;
}

interface EventHandlers {
  highWater(): void;
  lowWater(): void;
}

interface AsyncResolver<T> {
  resolve: (res: IteratorResult<T>) => void;
  reject: (err: Error) => void;
}

class EventQueue<T> {
  highWaterMark: number | undefined;
  lowWaterMark: number | undefined;

  readonly pullQueue: Array<AsyncResolver<T>> = [];
  readonly pushQueue: Array<Promise<IteratorResult<T>>> = [];
  readonly eventHandlers: Partial<EventHandlers> = {};

  isPaused = false;
  isStopped = false;
  removeCallback?: RemoveHandler;

  push(value: T): void {
    if (this.isStopped) return;

    const resolution = { value, done: false };
    if (this.pullQueue.length) {
      const placeholder = this.pullQueue.shift();
      if (placeholder) placeholder.resolve(resolution);
    } else {
      this.pushQueue.push(Promise.resolve(resolution));
      if (
        this.highWaterMark !== undefined &&
        this.pushQueue.length >= this.highWaterMark &&
        !this.isPaused
      ) {
        this.isPaused = true;
        if (this.eventHandlers.highWater) {
          this.eventHandlers.highWater();
        } else if (console) {
          console.warn(
            `EventIterator queue reached ${this.pushQueue.length} items`,
          );
        }
      }
    }
  }

  stop(): void {
    if (this.isStopped) return;
    this.isStopped = true;
    this.remove();

    for (const placeholder of this.pullQueue) {
      placeholder.resolve({ value: undefined, done: true });
    }

    this.pullQueue.length = 0;
  }

  fail(error: Error): void {
    if (this.isStopped) return;
    this.isStopped = true;
    this.remove();

    if (this.pullQueue.length) {
      for (const placeholder of this.pullQueue) {
        placeholder.reject(error);
      }

      this.pullQueue.length = 0;
    } else {
      const rejection = Promise.reject(error);

      /* Attach error handler to avoid leaking an unhandled promise rejection. */
      rejection.catch(() => { });
      this.pushQueue.push(rejection);
    }
  }

  remove() {
    Promise.resolve().then(() => {
      if (this.removeCallback) this.removeCallback();
    });
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: (value?: any) => {
        const result = this.pushQueue.shift();
        if (result) {
          if (
            this.lowWaterMark !== undefined &&
            this.pushQueue.length <= this.lowWaterMark &&
            this.isPaused
          ) {
            this.isPaused = false;
            if (this.eventHandlers.lowWater) {
              this.eventHandlers.lowWater();
            }
          }

          return result;
        } else if (this.isStopped) {
          return Promise.resolve({ value: undefined, done: true });
        } else {
          return new Promise((resolve, reject) => {
            this.pullQueue.push({ resolve, reject });
          });
        }
      },

      return: () => {
        this.isStopped = true;
        this.pushQueue.length = 0;
        this.remove();
        return Promise.resolve({ value: undefined, done: true });
      },
    };
  }

}

export class EventIterator<T> implements AsyncIterable<T> {
  [Symbol.asyncIterator]: () => AsyncIterator<T>;

  constructor (
    listen: ListenHandler<T>,
    { highWaterMark = 100, lowWaterMark = 1 }: Partial<EventIteratorOptions> = {},
  ) {
    const queue = new EventQueue<T>();
    queue.highWaterMark = highWaterMark;
    queue.lowWaterMark = lowWaterMark;

    queue.removeCallback =
      listen({
        push: value => queue.push(value),

        stop: () => queue.stop(),

        fail: error => queue.fail(error),

        on: (event, fn) => {
          queue.eventHandlers[event] = fn;
        },

        setRemoveCb: (removeHandler?: RemoveHandler) => queue.removeCallback = removeHandler,

        [Symbol.asyncIterator]: () => queue[Symbol.asyncIterator](),

        errorIterator: (message: ErrorStream) => new ErrorIterator(message),
      }) || (() => { });

    this[Symbol.asyncIterator] = () => queue[Symbol.asyncIterator]();
    Object.freeze(this);
  }
}


export class ErrorIterator {
  [Symbol.asyncIterator]: () => AsyncIterator<ErrorStream>;

  private sent = false;

  constructor (message: ErrorStream) {
    this[Symbol.asyncIterator] = () => {
      return {
        next: () => {
          if (this.sent) {
            return new Promise((resolve) => {
              resolve({ value: undefined, done: true });
            });
          }
          this.sent = true;
          return new Promise((resolve) => {
            resolve({ value: message, done: false });
          });
        },
        return: () => {
          return new Promise((resolve) => {
            resolve({ value: undefined, done: true });
          });
        }
      };
    };
  }
}



export default EventIterator;