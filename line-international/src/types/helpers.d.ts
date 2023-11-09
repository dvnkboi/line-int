type ArgumentsType<T extends (...args: any) => any> = T extends (...args: infer A) => any ? A : never;

interface Type<T> extends Function {
  new(...args: any[]): T;
}

type DiscoveredFile = {
  fileName: string;
  filePath: string;
  isDirectory: boolean;
  depth: number;
};