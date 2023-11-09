export interface NativeObject {
  get<T = any>(key: string): T | undefined;
  set<T = any>(key: string, value: T): 0 | 1 | 2; // 0 = error, 1 = key added, 2 = key replaced
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  length: number;
  stats(): {
    "numKeys": number,
    "dataSize": number,
    "indexSize": number,
    "metaSize": number,
    "numIndexes": number;
  };
  nextKey(key?: string): IterableIterator<string>;
}

// a more optimised version of map
export class Hash<K extends string = string> implements NativeObject {
  private readonly data: Map<K, any> = new Map();
  private currKey: K | undefined = undefined;

  public get<T = any>(key: K): T | undefined {
    return this.data.get(key);
  }

  public set(key: K, value: any): 0 | 1 | 2 {
    if (this.data.has(key)) {
      this.data.set(key, value);
      return 2;
    }
    else {
      this.data.set(key, value);
      return 1;
    }
  }

  public has(key: K): boolean {
    return this.data.has(key);
  }

  public delete(key: K): boolean {
    return this.data.delete(key);
  }

  public clear(): void {
    this.data.clear();
  }

  public get length(): number {
    return this.data.size;
  }

  public stats() {
    return {
      "numKeys": this.data.size,
      "dataSize": 0,
      "indexSize": 0,
      "metaSize": 0,
      "numIndexes": 0
    };
  }

  public *nextKey(key?: K): IterableIterator<K> {
    if (key) {
      this.currKey = key;
    }
    else {
      this.currKey = this.data.keys().next().value;
    }

    while (this.currKey) {
      yield this.currKey;
      this.currKey = this.data.keys().next().value;
    }
  }
}

export const globalHash = new Hash<string>();