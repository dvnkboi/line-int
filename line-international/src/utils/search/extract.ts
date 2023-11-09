import { calculateFolderDepth, sanitizePath } from "../index.js";

export const extractDirectories = (files: DiscoveredFile[]) => {
  const visited = new Set<string>();
  visited.add('');
  files.forEach(file => {
    const directoryArr = file.filePath.split('/');
    let directoryCumulated = '';
    for (const directory of directoryArr) {
      visited.add(directoryCumulated);
      directoryCumulated += `${directory}/`;
    }
  });
  return Array.from(visited).map((directory) => {
    directory = sanitizePath(directory);

    const nameSplit = directory.split('/');
    const name = nameSplit[nameSplit.length - 1];
    const depth = calculateFolderDepth(directory);

    return {
      filePath: directory,
      fileName: name as string,
      isDirectory: true,
      depth
    };
  });
};