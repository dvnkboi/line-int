import { cpus } from "os";
import { Logger } from "../index.js";

function sizeOf(obj: any, bytes: number = 0) {
  if (obj !== null && obj !== undefined) {
    switch (typeof obj) {
      case 'number':
        bytes += 8;
        break;
      case 'string':
        bytes += obj.length * 2;
        break;
      case 'boolean':
        bytes += 4;
        break;
      case 'object':
        var objClass = Object.prototype.toString.call(obj).slice(8, -1);
        if (objClass === 'Object' || objClass === 'Array') {
          for (var key in obj) {
            if (!obj.hasOwnProperty(key)) continue;
            return sizeOf(obj[key], bytes);
          }
        } else bytes += obj.toString().length * 2;
        break;
    }
  }
  return bytes;
};

function formatByteSize(bytes) {
  if (bytes < 1024) return bytes + " bytes";
  else if (bytes < 1048576) return (bytes / 1024).toFixed(3) + " KiB";
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(3) + " MiB";
  else return (bytes / 1073741824).toFixed(3) + " GiB";
};

function unformatByteSize(size: string) {
  const [number, unit] = size.split(' ');
  switch (unit) {
    case 'bytes':
      return Number(number);
    case 'KiB':
      return Number(number) * 1024;
    case 'MiB':
      return Number(number) * 1048576;
    case 'GiB':
      return Number(number) * 1073741824;
  }
}

export function memorySizeOf(obj) {
  return formatByteSize(sizeOf(obj));
};

export function getMemoryUsage() {
  return formatByteSize(process.memoryUsage().heapUsed);
};

export function getMemoryUsagePercentage() {
  return `${((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100).toFixed(2)}%`;
};

export function getMemoryUsagePercentageRaw() {
  return (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;
};

export function getCPUUsage() {
  return process.cpuUsage().user / 1000;
}

export function getCPUUsagePercentage() {
  return `${((process.cpuUsage().user / 1000) / cpus().length).toFixed(2)}%`;
}


export function stats(logger?: Logger): StatObject {
  if (!logger) return {
    memory: {
      used: getMemoryUsage(),
      usedPercentage: getMemoryUsagePercentage(),
      usedPercentageRaw: getMemoryUsagePercentageRaw()
    },
    cpu: {
      used: getCPUUsage(),
      usedPercentage: getCPUUsagePercentage()
    }
  };
  else {
    logger.debug('stats', `Memory usage: ${getMemoryUsage()} (${getMemoryUsagePercentage()})`);
    logger.debug('stats', `CPU usage: ${getCPUUsage()} (${getCPUUsagePercentage()})`);
  }
}

export const combineStats = (stats: StatObject[] | ThreadStatObject, logger: Logger) => {

  let statsArray: StatObject[] = [];

  if (Array.isArray(stats)) statsArray = stats;
  else {
    for (const key in stats) {
      statsArray.push(stats[key]);
    }
  }

  // a table of threads and their usage stats
  //threads:  thread 1     thread 2     thread 3
  //cpu:      1.2%         0.8%         0.4%
  //memory:   1.2 GiB      1.1 GiB      1.0 GiB
  //total:    3.6 GiB      3.5 GiB      3.4 GiB
  //average:  1.2 GiB      1.2 GiB      1.1 GiB
  //average:  0.8%         0.8%         0.7%

  const dataTable: string[] = [];
  dataTable.push('threads', 'cpu', 'memory');
  statsArray.map((stat, i) => {
    dataTable.push(i.toString(), stat.cpu.usedPercentage, formatByteSize(unformatByteSize(stat.memory.used)));
  });

  const table = createConsoleTable(dataTable);

  logger.info('stats', 'Stats for all threads');
  table.map((row) => {
    logger.info('stats', row.join(' | '));
  });
  logger.info('stats', `Total memory usage: ${formatByteSize(statsArray.reduce((acc, stat) => acc + unformatByteSize(stat.memory.used), 0))}`);
  logger.info('stats', `Average memory usage: ${formatByteSize(statsArray.reduce((acc, stat) => acc + unformatByteSize(stat.memory.used), 0) / statsArray.length)}`);
  logger.info('stats', `Total CPU usage: ${statsArray.reduce((acc, stat) => acc + Number(stat.cpu.usedPercentage.replace('%', '')), 0).toFixed(2)}%`);
};


const createConsoleTable = (data: Array<string>) => {
  const table: Array<Array<string>> = [];
  const columns = 3;
  const rows = data.length / columns;
  for (let i = 0; i < rows; i++) {
    table.push(data.slice(i * columns, (i + 1) * columns));
  }

  const columnWidths = table.reduce((acc, row) => {
    row.map((column, i) => {
      if (column.length > acc[i]) acc[i] = column.length;
    });
    return acc;
  }, [0, 0, 0]);

  const paddedTable = table.map((row) => {
    return row.map((column, i) => {
      return column.padEnd(columnWidths[i]);
    });
  });

  return paddedTable;
};