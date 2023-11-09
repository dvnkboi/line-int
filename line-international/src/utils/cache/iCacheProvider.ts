export interface ICacheProvider {
  tag: string;
  expiry: number;
  get: <T = any>(key: string) => Promise<T | null>;
  set: (key: string, value: string, expiry?: number) => Promise<void>;
  exists: (key: string) => Promise<boolean>;
  delete: (key: string) => Promise<void>;
  destroy: () => Promise<void>;
}



export interface ICache extends ICacheProvider {
  setProvider: (provider: ICacheProvider) => void;
}