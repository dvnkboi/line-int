import cluster, { Cluster } from 'cluster';
import { cpus } from 'os';
import { wait } from '../debug/index.js';


const cpuCount = cpus().length;
let threadCount = 0;
export const onlineCount = () => cluster.workers ? Object.keys(cluster.workers).length : 0;
export const getThreadCount = () => threadCount;
export const getCpuCount = () => cpuCount;
export const getWorker = () => {
  if (!isWorker()) {
    return {
      id: 0
    };
  }
  return cluster.worker;
};
export const getWorkers = () => cluster.workers;
export const getCluster = () => cluster;
export const currentWorker = () => {
  return {
    id: cluster.worker?.id ?? 0,
    pid: cluster.worker?.process.pid ?? 0
  };
};

export const createWorkers = (count: number = cpuCount, force = false, timeout = 5000): Promise<Cluster> => {
  return new Promise(async (res) => {
    if (cluster.isPrimary) {
      const to = setTimeout(() => {
        res(cluster);
        console.warn(`Timeout reached, only ${onlineCount()} workers online`);
      }, timeout);

      if (onlineCount() == count) return;
      else {
        for (const id in cluster.workers) {
          cluster.workers[id]?.kill();
        }
      }
      if (count > cpuCount && !force) {
        console.warn(`Cannot create ${count} workers, only ${cpuCount} CPUs available`);
        count = cpuCount;
      }

      threadCount = count;
      let workersUp = 0;
      cluster.on("online", (worker: Worker) => {
        workersUp++;
        if (workersUp == count) {
          clearTimeout(to);
          res(cluster);
        }
      });

      for (let i = 0; i < count; i++) {
        await wait(100);
        cluster.fork();
      }
    }
  });
};

export const onWorkerExit = (callback: (worker: Cluster['worker']) => void) => {
  cluster.on("exit", (worker) => {
    callback(worker);
  });
};

export const runOnPrimary = (callback: () => void) => {
  if (cluster.isPrimary) {
    callback();
  }
};

export const runOnWorker = (callback: () => void) => {
  if (cluster.isWorker) {
    callback();
  }
};

export const onAllWorkersExit = (callback: (cluster: Cluster) => void) => {
  if (cluster.isPrimary) {
    cluster.on("exit", () => {
      if (onlineCount() == 0) {
        callback(cluster);
      }
    });
  }
};

export const isWorker = (id?: number) => {
  if (id == undefined) {
    return cluster.isWorker;
  }
  return currentWorker().id === id;
};