import { Injectable } from "@decorators/di";
import { ILogOutput, LogLevel } from "./iLogOutput.js";
import { tagSplitFileLog } from "./logHandlers.js";
import { acquireLock, releaseLock } from "../threading/locks.js";

@Injectable()
export class Logger implements ILogOutput {
  private loggers: ILogOutput[];

  constructor () {
    this.loggers = [tagSplitFileLog];
  }

  public setLogger(...logger: ILogOutput[]) {
    this.loggers = logger;
    return this;
  }

  public async log(tag: string, message: any, level: LogLevel): Promise<void> {
    await acquireLock(`log_${tag}`);
    for (const logger of this.loggers) {
      await logger.log(tag, message, level);
    }
    await releaseLock(`log_${tag}`);
  }

  public async debug(tag: string, ...message: any[]): Promise<void> {
    await acquireLock(`log_${tag}`);
    for (const logger of this.loggers) {
      await logger.debug(tag, ...message);
    }
    await releaseLock(`log_${tag}`);
  }

  public async error(tag: string, ...message: string[]): Promise<void> {
    await acquireLock(`log_${tag}`);
    for (const logger of this.loggers) {
      await logger.error(tag, ...message);
    }
    await releaseLock(`log_${tag}`);
  }

  public async warn(tag: string, ...message: any[]): Promise<void> {
    await acquireLock(`log_${tag}`);
    for (const logger of this.loggers) {
      await logger.warn(tag, ...message);
    }
    await releaseLock(`log_${tag}`);
  }

  public async info(tag: string, ...message: any[]): Promise<void> {
    await acquireLock(`log_${tag}`);
    for (const logger of this.loggers) {
      await logger.info(tag, ...message);
    }
    await releaseLock(`log_${tag}`);
  }

  public async newLine(count: number = 1): Promise<void> {
    await acquireLock(`log_nl`);
    for (const logger of this.loggers) {
      await logger.newLine(count);
    }
    await releaseLock(`log_nl`);
  }

  public async clear(tag?: string): Promise<void> {
    await acquireLock(`log_${tag}`);
    for (const logger of this.loggers) {
      await logger.clear(tag);
    }
    await releaseLock(`log_${tag}`);
  }
}