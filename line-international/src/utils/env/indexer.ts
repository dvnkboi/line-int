import { extractDirectories, filter, fuzzySearch } from "../search/index.js";
import { Logger } from "../log/index.js";
import { env } from "./env.js";
import { createWalker, sanitizePath } from "./path.js";
import { Container } from "../index.js";
import { eventManager } from "../threading/events.js";
import { getWorker } from "../threading/threadManager.js";

const fileRootDir = env.server.storagePath;

export class Index {
  private static index: DiscoveredFile[] = [];
  private static generatingIndex = false;
  private static log: Logger;

  static async init() {
    this.log = await Container.get<Logger>(Logger);

    await this.log.info('Index', 'Initializing index');
    const startDate = new Date();
    this.generatingIndex = true;
    const storageWalker = createWalker(fileRootDir);
    const fileGenerator = storageWalker('', 20);
    for await (const file of fileGenerator) {
      this.index.push({
        depth: file.depth,
        fileName: file.fileName,
        filePath: file.filePath,
        isDirectory: file.isDirectory
      });
    }

    this.index.push({
      depth: 0,
      fileName: '',
      filePath: '',
      isDirectory: true
    });

    this.generatingIndex = false;
    await this.log.info('Index', `Index initialized in ${new Date().getTime() - startDate.getTime()}ms with ${this.index.length} files`);

    eventManager.on('index:added', (workerId, files) => {
      if (workerId === getWorker().id) {
        return;
      }

      this.index.push(...files);
    });

    eventManager.on('index:deleted', (workerId, file) => {
      if (workerId === getWorker().id) {
        return;
      }

      const index = this.index.findIndex((f) => f.filePath === file.filePath);
      if (index > -1) {
        this.index.splice(index, 1);
      }
    });

    eventManager.on('index:updated', (workerId, file) => {
      if (workerId === getWorker().id) {
        return;
      }

      const index = this.index.findIndex((f) => f.filePath === file.filePath);
      if (index > -1) {
        this.index[index] = file;
      }
    });
  }


  static search(searchTerm: string, filters: string = '') {
    if (this.generatingIndex) {
      return [];
    }

    const filteredFiles = filter(this.index, filters).filter((file) => file.fileName != '');

    const files = fuzzySearch(searchTerm, filteredFiles, {
      key: 'filePath',
      take: 10,
      gramSize: 2,
      threshold: 0
    });

    return files;
  }

  static get(path: string): DiscoveredFile | null {
    if (this.generatingIndex) {
      return null;
    }

    const file = this.index.find((file) => file.filePath === path);
    return file;
  }

  static getFiles(path: string = '', depth = 5): DiscoveredFile[] {
    if (this.generatingIndex) {
      return [];
    }

    path = sanitizePath(path);

    const file = this.index.find((file) => file.filePath === path);

    if (!file) {
      return [];
    }

    const files = this.index.filter((f) => f.filePath.startsWith(file.filePath) && f.depth <= file.depth + depth && f.depth > file.depth);

    return files;
  }

  static add(...files: DiscoveredFile[]) {
    if (this.generatingIndex) {
      return;
    }

    this.index.push(...files);

    eventManager.emit('index:added', getWorker().id, files);
  }

  static delete(file: DiscoveredFile) {
    if (this.generatingIndex) {
      return;
    }

    const index = this.index.findIndex((f) => f.filePath === file.filePath);
    if (index > -1) {
      this.index.splice(index, 1);
    }

    eventManager.emit('index:deleted', getWorker().id, file);
  }

  static update(path: string, file: DiscoveredFile) {
    if (this.generatingIndex) {
      return;
    }

    const index = this.index.findIndex((f) => f.filePath === path);
    if (index > -1) {
      this.index[index] = file;
    }

    eventManager.emit('index:updated', getWorker().id, file);
  }
}