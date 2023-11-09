import { open, FileHandle, mkdir } from "fs/promises";
import { ILogOutput, LogLevel } from "./iLogOutput.js";
import { $dir } from "../env/index.js";
import { env } from "../env/env.js";
import { $mkdir } from "../env/path.js";
import { threadId } from "worker_threads";
import { isWorker } from "../threading/threadManager.js";


// helper functions
const getLogLevelNumber = (level: string): number => {
  switch (level) {
    case 'log':
      return 0;
    case 'info':
      return 1;
    case 'warn':
      return 2;
    case 'error':
      return 3;
    default:
      return 0;
  }
};

const logLevelCheck = (level: string) => {
  return getLogLevelNumber(level) >= numLevel;
};

// constants 
const logEnv = env.log;
const logDir = $dir(logEnv.logDir);
const logLevel = logEnv.level;
const numLevel = getLogLevelNumber(logLevel);


// create log dir if not exists
if (!isWorker()) await $mkdir(logEnv.logDir);


// log handlers

// outputs seperate files by tag
class TagSplitFileLog implements ILogOutput {

  private static files: Map<string, FileHandle> = new Map<string, FileHandle>();

  private bufferMap: Map<string, { timeout: number | NodeJS.Timeout; buffer: string[]; }> = new Map<string, { timeout: number | NodeJS.Timeout; buffer: string[]; }>();

  private async write(tag: string, message: any[], level: LogLevel = 'debug') {
    if (!logLevelCheck(level)) return;
    await this.writeToBuffer(tag, message, level);
  }

  private writeToBuffer(tag: string, message: any[], level: LogLevel = 'debug') {
    if (!this.bufferMap.has(tag)) this.bufferMap.set(tag, { timeout: 0, buffer: [] });
    const bufferObject = this.bufferMap.get(tag);
    clearTimeout(bufferObject.timeout);
    return new Promise<void>((resolve, reject) => {
      const messageString = message.join(' ');
      bufferObject.buffer.push(message.length == 0 ? '\n' : generateLogMsg(tag, messageString, level));
      bufferObject.timeout = setTimeout(async () => {
        const file = await this.getLog(tag);
        await file.write(bufferObject.buffer.join(''));
        bufferObject.buffer = [];
        resolve();
      }, 5000);
    }
    );
  }


  public async debug(tag: string, ...message: any[]): Promise<void> {
    await this.write(tag, message, 'debug');
  }
  public async error(tag: string, ...message: any[]): Promise<void> {
    this.write(tag, message, 'error');
  }
  public async warn(tag: string, ...message: any[]): Promise<void> {
    this.write(tag, message, 'warn');
  }
  public async info(tag: string, ...message: any[]): Promise<void> {
    this.write(tag, message, 'info');
  }

  public async log(tag: string, message: any, level: LogLevel = 'debug'): Promise<void> {
    this.write(tag, [message], level);
  }

  public async newLine(count = 1): Promise<void> {
    for (let i = 0; i < count; i++) {
      await this.write('', []);
    }
  }

  public async clear(tag?: string): Promise<void> {
    if (!tag) {
      for (const file of TagSplitFileLog.files.values()) {
        await file.truncate(0);
      }
      return;
    }
    const file = await this.getLog(tag);
    await file.truncate(0);
  }

  private async getLog(tag: string): Promise<FileHandle> {
    if (!TagSplitFileLog.files.has(tag)) {
      TagSplitFileLog.files.set(tag, await open(`${logDir}/${tag}.log`, 'a'));
    }
    return TagSplitFileLog.files.get(tag)!;
  }
};

// outputs all to a single file
class SingleFileLog implements ILogOutput {

  private file: FileHandle;

  private buffer: string[] = [];
  private writeTO: number | NodeJS.Timeout;

  private async write(tag: string, message: any[], level: LogLevel = 'debug') {
    if (!logLevelCheck(level)) return;
    clearTimeout(this.writeTO);
    if (!this.buffer) this.buffer = [];
    const messageString = message.join(' ');
    this.buffer.push(message.length == 0 ? '\n' : generateLogMsg(tag, messageString, level));
    this.writeTO = setTimeout(async () => {
      const file = await this.getLog();
      await file.write(this.buffer.join(''));
      this.buffer = [];
    }, 5000);
  }

  public async debug(tag: string, ...message: any[]): Promise<void> {
    await this.write(tag, message, 'debug');
  }

  public async error(tag: string, ...message: any[]): Promise<void> {
    await this.write(tag, message, 'error');
  }

  public async warn(tag: string, ...message: any[]): Promise<void> {
    await this.write(tag, message, 'warn');
  }

  public async info(tag: string, ...message: any[]): Promise<void> {
    await this.write(tag, message, 'info');
  }

  public async log(tag: string, message: any, level: LogLevel = 'debug'): Promise<void> {
    await this.write(tag, [message], level);
  }

  public async newLine(count = 1): Promise<void> {
    for (let i = 0; i < count; i++) {
      await this.write('', []);
    }
  }

  public async clear(): Promise<void> {
    const file = await this.getLog();
    await file.truncate(0);
  }

  private async getLog(): Promise<FileHandle> {
    if (!this.file) {
      this.file = await open(`${logDir}/output.log`, 'a');
    }
    return this.file;
  }
}

// console output with colors
class ConsoleLog implements ILogOutput {

  private async write(tag: string, message: any[], level: LogLevel = 'debug') {
    if (!logLevelCheck(level)) return;

    const messageString = message.join(' ');

    if (message.length == 0) {
      console.log('');
      return;
    }

    switch (level) {
      case 'debug':
        console.log('\x1b[0m\x1b[2m\x1b[36m%s', generateLogMsg(tag, messageString, level, false), '\x1b[0m'); //color dim cyan
        break;
      case 'error':
        console.log('\x1b[0m\x1b[31m%s', generateLogMsg(tag, messageString, level, false), '\x1b[0m'); // color red
        break;
      case 'warn':
        console.log('\x1b[0m\x1b[33m%s', generateLogMsg(tag, messageString, level, false), '\x1b[0m'); // color yellow
        break;
      case 'info':
        console.log('\x1b[0m\x1b[1m\x1b[90m%s', generateLogMsg(tag, messageString, level, false), '\x1b[0m'); // color gray
        break;
    }
  }

  public async debug(tag: string, ...message: any[]): Promise<void> {
    await this.write(tag, message, 'debug');
  }

  public async error(tag: string, ...message: any[]): Promise<void> {
    await this.write(tag, message, 'error');
  }

  public async warn(tag: string, ...message: any[]): Promise<void> {
    await this.write(tag, message, 'warn');
  }

  public async info(tag: string, ...message: any[]): Promise<void> {
    await this.write(tag, message, 'info');
  }

  public async newLine(count: number = 1): Promise<void> {
    for (let i = 0; i < count; i++) {
      await this.write('', []);
    }
  }

  public async log(tag: string, message: any, level: LogLevel = 'debug'): Promise<void> {
    await this.write(tag, [message], level);
  }

  public async clear(): Promise<void> {
    console.clear();
  }
}

const generateLogMsg = (tag: string, message: any, level: LogLevel = 'debug', returns: boolean = true) => {
  return `${new Date().toISOString()} - [on: ${process.pid}:${threadId}] - ${tag} ${padSpace(level)} : ${message} ${returns ? '\n' : ''}`;
};

const padSpace = (level: string) => {
  return `[${level}]`.padEnd(7);
};

export const tagSplitFileLog = new TagSplitFileLog();
export const consoleLog = new ConsoleLog();
export const singleFileLog = new SingleFileLog();