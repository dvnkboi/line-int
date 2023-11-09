type FilterArray = ((file: DiscoveredFile) => boolean)[];


export const filter = (files: DiscoveredFile[], filteringFunctions: FilterArray | string | string[]) => {
  const filters = constructFilters(filteringFunctions);
  if (!filters || filters.length === 0) return files;
  return files.filter((file) => {
    return filters.some((filteringFunction) => {
      return filteringFunction(file);
    });
  });
};

// transform the filters='type:images|type:data' into filterFunctions
export const constructFilters = (filters: string | string[] | FilterArray) => {
  if (!filters) {
    return [];
  }

  if (filters instanceof Array && filters[0] instanceof Function) return filters as FilterArray;

  if (typeof filters === 'string') {
    filters = filters.replace(/['"]/g, '').split('|');
  }

  return filters.map(filter => {
    const [key, value] = filter.split(':');
    return filterFunctions[key][value];
  }) as FilterArray;
};

const getExtension = (fileName: string) => {
  return fileName.split('.').pop();
};

export const filterFunctions = {
  'type': {
    'image': (file: DiscoveredFile) => ['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(getExtension(file.fileName)),
    'data': (file: DiscoveredFile) => ['csv', 'xls', 'xlsx', 'json'].includes(getExtension(file.fileName)),
    'pdf': (file: DiscoveredFile) => ['pdf'].includes(getExtension(file.fileName)),
    'video': (file: DiscoveredFile) => ['mp4', 'mov', 'avi'].includes(getExtension(file.fileName)),
    'audio': (file: DiscoveredFile) => ['mp3', 'wav'].includes(getExtension(file.fileName)),
    'text': (file: DiscoveredFile) => ['txt'].includes(getExtension(file.fileName)),
    'unknown': (file: DiscoveredFile) => file.fileName.split('.').length === 1,
    'folder': (file: DiscoveredFile) => file.isDirectory
  }
};








