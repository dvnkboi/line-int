import { wait } from "../debug/other.js";
import { getCluster, isWorker } from "./threadManager.js";
import { State } from "./state.js";


const createLockManager = (waitOnLock: number = 100) => {
  if (isWorker()) {
    const cluster = getCluster();

    let queueTimeout: NodeJS.Timeout | null = null;

    const pushToQueue = async (key: string) => {
      let queue = await State.get<Array<number>>(`lock_queue_${key}`) ?? [];
      if (!(queue instanceof Array)) queue = [];
      const current = await State.get<number>(`lock_current_${key}`);
      const workerId = cluster.worker?.id ?? 0;
      if (!queue.includes(workerId) && current != workerId) queue.push(workerId);
      await State.set(`lock_queue_${key}`, queue);
      return queue;
    };

    const next = async (key: string) => {
      let queue = await State.get<Array<number>>(`lock_queue_${key}`) ?? [];
      if (!(queue instanceof Array)) queue = [];
      const n = queue.shift();
      await State.set(`lock_queue_${key}`, queue);
      await State.set(`lock_current_${key}`, n);
      return n;
    };

    const acquireLock = async (key: string, ttl: number = 10000) => {
      const queue = await pushToQueue(key);
      const current = await State.get<number>(`lock_current_${key}`);
      const currentTTL = await State.get<number>(`lock_current_ttl_${key}`);

      if (!current || !currentTTL || (currentTTL && currentTTL < Date.now())) {
        await State.set(`lock_current_${key}`, queue.shift());
        await State.set(`lock_current_ttl_${key}`, ttl + Date.now());
        await State.set(`lock_queue_${key}`, queue);
        queueTimeout = setTimeout(async () => {
          await next(key);
        }, ttl);
        return;
      }

      if (current == cluster.worker?.id) {
        await State.set(`lock_current_ttl_${key}`, ttl + Date.now());
        return;
      }

      if (queue.includes(cluster.worker?.id)) {
        await State.waitUntilValue(`lock_current_${key}`, cluster.worker?.id);
        return await acquireLock(key, ttl);
      }

      await wait(waitOnLock);
      return await acquireLock(key, ttl);
    };

    const releaseLock = async (key: string): Promise<'free' | 'notPermited'> => {
      clearTimeout(queueTimeout);
      const current = await State.get<number>(`lock_current_${key}`);
      if (current != cluster.worker?.id) {
        return 'notPermited';
      }
      await next(key);
      return 'free';
    };
    return {
      acquireLock,
      releaseLock
    };
  }
  else {
    const cluster = getCluster();

    let queueTimeout: NodeJS.Timeout | null = null;

    const pushToQueue = async (key: string) => {
      const queue = await State.get<Array<number>>(`lock_queue_${key}`) ?? [];
      const current = await State.get<number>(`lock_current_${key}`);
      const workerId = cluster.worker?.id ?? 0;
      if (!queue.includes(workerId) && current != workerId) queue.push(workerId);
      await State.set(`lock_queue_${key}`, queue);
      return queue;
    };

    const next = async (key: string) => {
      let queue = await State.get<Array<number>>(`lock_queue_${key}`) ?? [];
      if (!(queue instanceof Array)) queue = [];
      const n = queue.shift();
      await State.set(`lock_queue_${key}`, queue);
      await State.set(`lock_current_${key}`, n);
      return n;
    };

    const acquireLock = async (key: string, ttl: number = 10000) => {
      const queue = await pushToQueue(key);
      const current = await State.get<number>(`lock_current_${key}`);
      const currentTTL = await State.get<number>(`lock_current_ttl_${key}`);

      if (!current || !currentTTL || (currentTTL && currentTTL < Date.now())) {
        await State.set(`lock_current_${key}`, queue.shift());
        await State.set(`lock_current_ttl_${key}`, ttl + Date.now());
        await State.set(`lock_queue_${key}`, queue);
        queueTimeout = setTimeout(async () => {
          await next(key);
        }, ttl);
        return;
      }

      if (current == cluster.worker?.id) {
        await State.set(`lock_current_ttl_${key}`, ttl + Date.now());
        return;
      }

      if (queue.includes(cluster.worker?.id)) {
        await State.waitUntilValue(`lock_current_${key}`, cluster.worker?.id);
        return await acquireLock(key, ttl);
      }

      await wait(waitOnLock);
      return await acquireLock(key, ttl);
    };

    const releaseLock = async (key: string): Promise<'free' | 'notPermited'> => {
      clearTimeout(queueTimeout);
      const current = await State.get<number>(`lock_current_${key}`);
      if (current != cluster.worker?.id) {
        return 'notPermited';
      }
      await next(key);
      return 'free';
    };
    return {
      acquireLock,
      releaseLock
    };
  }
};

export const { acquireLock, releaseLock } = createLockManager();