import { existsSync } from "fs";
import { access, mkdir, readdir, rm, rename, readFile } from "fs/promises";
import { join } from "node:path";
import { readChunk } from 'read-chunk';
import { fileTypeFromBuffer } from 'file-type';




function getAppRootDir() {
  let currentDir = process.cwd();
  while (!existsSync(join(currentDir, 'package.json'))) {
    currentDir = join(currentDir, '..');
  }
  return currentDir;
}

export const projectDir = getAppRootDir();

export const $dir = (dir: string) => join(getAppRootDir(), dir);

export const $mkdir = async (dir: string) => {
  try {
    await access(dir);
  } catch (error) {
    await mkdir(dir, { recursive: true });
  }
};

// function to remove directory recursively
export const $rmdir = async (dir: string) => {
  rm(dir, { recursive: true, maxRetries: 3, retryDelay: 1000, force: true });
};

export const exists = async (dir: string) => {
  try {
    await access(dir);
    return true;
  } catch (error) {
    return false;
  }
};

export const $rename = async (newName: string, path: string) => {
  // rename path containing file to new name
  const newPath = join(path, '..', newName);

  // check if new path exists
  if (!(await exists(newPath))) {
    return;
  }

  // rename file to new name
  await rename(path, newPath);
};

export const $content = async (path: string) => {
  if (!(await exists(path))) {
    return;
  }
  return await readFile(path, 'utf8');
};

export const $getType = async (path: string) => {
  // check if file exists
  if (!(await exists(path))) {
    return;
  }

  const buffer = await readChunk(path, {
    length: 4100,
    startPosition: 0
  });

  const type = await fileTypeFromBuffer(buffer);

  return type?.mime;

};

export const $join = (...paths: string[]) => {
  const path = join(...paths);
  return path.replace(/\\/g, '/');
};


export function createWalker(root: string) {
  return async function* walkDirectory(dir: string = '/', maxDepth = 1): AsyncGenerator<DiscoveredFile> {
    dir = sanitizePath(dir);

    const depth = calculateFolderDepth(dir);

    const files = await readdir(join(root, dir), { withFileTypes: true });
    for (const file of files) {
      const path = sanitizePath($join(dir, file.name));
      if (file.isDirectory()) {
        yield {
          fileName: file.name,
          filePath: path,
          isDirectory: true,
          depth: calculateFolderDepth(path)
        };
        if (maxDepth > depth) {
          yield* walkDirectory($join(dir, file.name), maxDepth);
        }
      } else {
        yield {
          fileName: file.name,
          filePath: path,
          isDirectory: false,
          depth: calculateFileDepth(path)
        };
      }
    }
  };
}


export const sanitizePath = (path: string) => {
  path = path.replace(/\\/g, '/');
  path = path.replace(/\/\//g, '/');
  if (path.endsWith('/')) {
    path = path.substring(0, path.length - 1);
  }
  if (path.startsWith('/')) {
    path = path.substring(1);
  }
  return path;
};

export const calculateFolderDepth = (path: string) => {
  if (path == '') return 0;
  if (!path.includes('/')) return 1;
  return path.split('/').length;
};

export const calculateFileDepth = (path: string) => {
  if (path == '') return 0;
  if (!path.includes('/')) return 1;
  return path.split('/').length;
};