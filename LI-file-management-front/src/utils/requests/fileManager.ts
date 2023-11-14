import { Exception } from "../error";

export type DiscoveredFile = {
  fileName: string;
  filePath: string;
  isDirectory: boolean;
  depth: number;
};

export type FileArrayResponse = {
  files: Array<DiscoveredFile>;
  count: number;
};

export type SearchResponse = {
  files: Array<{
    item: DiscoveredFile;
    score: number;
  }>;
  count: number;
};

export type FilePreviewType = { filePath: string; content: string; type: ReturnType<typeof getContentType>; };

export type FilterArr = ('type:image' | 'type:data' | 'type:pdf' | 'type:video' | 'type:audio' | 'type:text' | 'type:unknown' | 'type:folder')[];

const host = import.meta.env.VITE_SERVER_HOST;



export const getFiles = async (dir: string = '/'): Promise<FileArrayResponse> => {
  if (!dir) dir = '/';

  if (dir.charAt(0) === '/') {
    dir = dir.substring(1);
  }

  const response = await fetch(`${host}/api/files/directory/${dir}`, {
    credentials: 'include',
  });

  const data = await response.json();

  return data;
};

export const searchFiles = async (query: string, filters: FilterArr): Promise<SearchResponse> => {
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

  if (filePath.charAt(0) === '/') {
    filePath = filePath.substring(1);
  }

  const response = await fetch(`${host}/api/files/preview/${filePath}`, {
    credentials: 'include',
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

export const createFolder = async (folderPath: string): Promise<FileArrayResponse['files'][number] | Exception<any>> => {

  if (folderPath.charAt(0) === '/') {
    folderPath = folderPath.substring(1);
  }

  const response = await fetch(`${host}/api/files/directory/${folderPath}`, {
    credentials: 'include',
    method: 'POST',
  });

  const data = await response.json();

  return data;
};

export const deleteFolder = async (folderPath: string): Promise<FileArrayResponse['files'][number] | Exception<any>> => {

  if (folderPath.charAt(0) === '/') {
    folderPath = folderPath.substring(1);
  }

  const response = await fetch(`${host}/api/files/directory/${folderPath}`, {
    credentials: 'include',
    method: 'DELETE',
  });

  const data = await response.json();

  return data;
};


export const deleteFile = async (filePath: string): Promise<FileArrayResponse['files'][number] | Exception<any>> => {

  if (filePath.charAt(0) === '/') {
    filePath = filePath.substring(1);
  }

  const response = await fetch(`${host}/api/files/file/${filePath}`, {
    credentials: 'include',
    method: 'DELETE',
  });

  const data = await response.json();

  return data;
};

export const getFullLog = () => {
  window.open(`${host}/api/logs/audit`, '_blank');
};

export const uploadFilesXHR = (path: string, files: FileList, progress: (progress: number) => void = () => { }) => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    if (path.charAt(0) === '/') {
      path = path.substring(1);
    }

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', e => progress(e.loaded / e.total));
    xhr.addEventListener('load', () => resolve({ status: xhr.status, body: xhr.responseText }));
    xhr.addEventListener('error', () => reject(new Error('File upload failed, try again later')));
    xhr.addEventListener('abort', () => reject(new Error('File upload aborted')));
    xhr.withCredentials = true;
    xhr.open('POST', `${host}/api/files/file/${path}`, true);
    Array.from(files).forEach((file, index) => formData.append(index.toString(), file));
    xhr.send(formData);
  });
};

export const uploadFiles = async (path: string, files: FileList, progress: (progress: number) => void = () => { }): Promise<any | Exception<any>> => {
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
  });

  const data = await response.json();

  return data;
};

export const join = (...args: string[]): string => {
  // make sure args dont start or end with '/'
  let path = args.join('/');

  path = path.replace(/\/\//g, '/');
  if (path.charAt(0) === '/') path = path.substring(1);
  if (path.charAt(path.length - 1) === '/') path = path.substring(0, path.length - 1);

  return path;
};