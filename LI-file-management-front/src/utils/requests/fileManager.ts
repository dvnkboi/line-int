export type FileArrayResponse = {
  files: Array<{
    fileName: string;
    filePath: string;
    isDirectory: boolean;
    depth: number;
  }>;
  count: number;
};

export type SearchResponse = {
  files: Array<{
    item: {
      fileName: string;
      filePath: string;
      isDirectory: boolean;
      depth: number;
    };
    score: number;
  }>;
  count: number;
};

export type FilePreviewType = { filePath: string; content: string; type: ReturnType<typeof getContentType>; };

export type FilterArr = ('type:image' | 'type:data' | 'type:pdf' | 'type:video' | 'type:audio' | 'type:text' | 'type:unknown' | 'type:folder')[];

const host = import.meta.env.VITE_SERVER_HOST;

const getHeaders = (): Promise<Headers> => {
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('Accept', 'application/json');
  return new Promise((res) => {
    const req = new XMLHttpRequest();
    req.open('GET', document.location.toString(), true);
    req.send(null);
    req.onload = function () {
      const headerString = req.getAllResponseHeaders().toLowerCase();
      const authHeader = headerString.match(/[aA]uthorization: (.*)/);
      const auth = authHeader ? authHeader[1] : '';
      headers.append('Authorization', auth);
      res(headers);
    };
  });
};



export const getFiles = async (dir: string = '/'): Promise<FileArrayResponse> => {
  const headers = await getHeaders();
  if (!dir) dir = '/';

  if (dir.charAt(0) === '/') {
    dir = dir.substring(1);
  }

  const response = await fetch(`${host}/api/files/directory/${dir}`, {
    credentials: 'include',
    headers,
  });

  const data = await response.json();

  return data;
};

export const searchFiles = async (query: string, filters: FilterArr): Promise<SearchResponse> => {
  const headers = await getHeaders();
  if (query.charAt(0) === '/') {
    query = query.substring(1);
  }

  let filterString = '';
  if (filters.length > 0) {
    filterString = filters.join('|');
  }

  filterString = filterString.length > 0 ? `?query=${filterString}` : '';


  const response = await fetch(`${host}/api/files/search/${query}${filterString}`, {
    credentials: 'include',
    headers,
  });

  const data = await response.json();

  return data;
};


export const getFile = async (filePath: string): Promise<void> => {
  if (filePath.charAt(0) === '/') {
    filePath = filePath.substring(1);
  }

  window.open(`${host}/api/files/file/${filePath}`, '_blank');
};

export const getFilePreview = async (filePath: string): Promise<FilePreviewType> => {
  const headers = await getHeaders();

  if (filePath.charAt(0) === '/') {
    filePath = filePath.substring(1);
  }

  const response = await fetch(`${host}/api/files/preview/${filePath}`, {
    credentials: 'include',
    headers,
  });

  const type = getContentType(response);

  switch (type) {
    case 'image':
      const blob = await response.blob();
      return {
        content: URL.createObjectURL(blob),
        type,
        filePath: filePath
      };
    case 'csv':
      const text = await response.text();
      return {
        content: text,
        type,
        filePath: filePath
      };
    default:
      const text2 = await response.text();
      return {
        content: text2,
        type,
        filePath: filePath
      };
  }
};

const getContentType = (response: Response) => {
  const contentType = response.headers.get('content-type')?.split(';')[0];
  switch (contentType) {
    case 'image/png':
    case 'image/jpeg':
      return 'image';
    case 'text/csv':
      return 'csv';
    default:
      return 'text';
  }
};

export const createFolder = async (folderPath: string): Promise<FileArrayResponse['files'][number]> => {
  const headers = await getHeaders();

  if (folderPath.charAt(0) === '/') {
    folderPath = folderPath.substring(1);
  }

  const response = await fetch(`${host}/api/files/directory/${folderPath}`, {
    credentials: 'include',
    method: 'POST',
    headers,
  });

  const data = await response.json();

  return data;
};

export const deleteFolder = async (folderPath: string): Promise<FileArrayResponse['files'][number]> => {
  const headers = await getHeaders();

  if (folderPath.charAt(0) === '/') {
    folderPath = folderPath.substring(1);
  }

  const response = await fetch(`${host}/api/files/directory/${folderPath}`, {
    credentials: 'include',
    method: 'DELETE',
    headers,
  });

  const data = await response.json();

  return data;
};


export const deleteFile = async (filePath: string): Promise<FileArrayResponse['files'][number]> => {
  const headers = await getHeaders();

  if (filePath.charAt(0) === '/') {
    filePath = filePath.substring(1);
  }

  const response = await fetch(`${host}/api/files/file/${filePath}`, {
    credentials: 'include',
    method: 'DELETE',
    headers,
  });

  const data = await response.json();

  return data;
};

export const uploadFiles = async (path: string, files: FileList, progress: (progress: number) => void = () => { }) => {
  const headers = await getHeaders();
  var formdata = new FormData();

  for (let i = 0; i < files.length; i++) {
    formdata.append('files', files[i]);
  }

  if (path.charAt(0) === '/') {
    path = path.substring(1);
  }

  const response = await fetch(`${host}/api/files/file/${path}`, {
    credentials: 'include',
    method: 'POST',
    body: formdata,
    headers,
  });

  const data = await response.json();

  return data;
};

export const join = (...args: string[]): string => {
  // make sure args dont start or end with '/'
  args = args.map(arg => {
    if (arg.charAt(0) === '/') {
      arg = arg.substring(1);
    }
    if (arg.charAt(arg.length - 1) === '/') {
      arg = arg.substring(0, arg.length - 1);
    }
    return arg;
  });
  return args.join('/');
};