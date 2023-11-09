import { stats } from "../debug/index.js";
import { getCluster, isWorker } from "./threadManager.js";

const nullMethods = async (): Promise<StatObject> => null;


const createStatsManager = () => {
  if (isWorker()) {
    const cluster = getCluster();
    if (process.env.STATS_ENABLED_WORKER == 'true') {
      return nullMethods;
    }

    process.on('message', async (message: any) => {
      if (message.type == 'stats') {
        process.send({
          type: 'stats_return',
          fromId: cluster.worker?.id,
          stats: stats(),
          issuedBy: message.issuedBy
        });
      }
    });


    const getStats = async (): Promise<ThreadStatObject> => {
      return new Promise((res) => {
        let statsObject: ThreadStatObject = {};

        let timeout: number;

        process.send({
          type: 'stats',
          issuedBy: cluster.worker?.id,
          fromId: cluster.worker?.id
        });

        const handler = (message: any) => {
          if (message.type == 'stats_return') {
            statsObject[message.fromId] = message.stats;
            clearTimeout(timeout);
            setTimeout(() => {
              process.send({
                type: 'main_stats',
              });
            }, 100);
          }
          if (message.type == 'main_stats_return') {
            statsObject[0] = message.stats;
            res(statsObject);
            process.off('message', handler);
          }
        };

        process.on('message', handler);
      });
    };

    return getStats;
  }
  else {
    const cluster = getCluster();
    if (process.env.STATS_ENABLED_MAIN == 'true') {
      return nullMethods;
    }
    process.env.LOCKS_ENABLED_MAIN = 'true';
    cluster.on('message', (worker, message: any) => {
      if (message.type == 'stats') {
        for (const id in cluster.workers) {
          cluster.workers[id].send({
            type: 'stats',
            issuedBy: message.issuedBy,
            fromId: id
          });
        }
      }
      if (message.type == 'stats_return') {
        const worker = cluster.workers[message.issuedBy];
        worker?.send(message);
      }
      if (message.type == 'main_stats') {
        worker.send({
          type: 'main_stats_return',
          stats: stats()
        });
      }
    });


    const getStats = async (): Promise<ThreadStatObject> => {
      return new Promise((res) => {
        let statsObject: ThreadStatObject = {};

        let timeout: number;

        statsObject[0] = stats();

        for (const id in cluster.workers) {
          cluster.workers[id].send({
            type: 'stats',
            issuedBy: 0,
            fromId: id
          });
        }

        const handler = (_: Worker, message: any) => {
          if (message.type == 'stats_return') {
            statsObject[message.fromId] = message.stats;
            clearTimeout(timeout);
            setTimeout(() => {
              res(statsObject);
              cluster.off('message', handler);
            }, 100);
          }
        };

        cluster.on('message', handler);
      });
    };

    return getStats;
  }
};

export const getStats = createStatsManager();