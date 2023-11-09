export interface ILogOutput {
  log: (tag: string, message: any, level?: LogLevel) => Promise<void>;
  debug: (tag: string, ...message: any[]) => Promise<void>;
  error: (tag: string, ...message: any[]) => Promise<void>;
  warn: (tag: string, ...message: any[]) => Promise<void>;
  info: (tag: string, ...message: any[]) => Promise<void>;
  newLine: (count?: number) => Promise<void>;
  clear: (tag?: string) => Promise<void>;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';