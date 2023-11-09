import { Container, Logger } from "../index.js";
import { ILogOutput, LogLevel } from "./iLogOutput.js";

type ArgumentsType<T extends (...args: any) => any> = T extends (...args: infer A) => any ? A : never;


export function Logs<T extends (...args: any) => any>(tag: string, key?: string, defaultLevel: LogLevel = 'debug') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    if (!key) key = propertyKey;


    // wrap the original method with a new method that logs the result
    descriptor.value = async function (...args: ArgumentsType<T>) {
      const logger = await Container.get<ILogOutput>(Logger);
      try {
        await logger[defaultLevel](tag, `called ${key} with args: ${JSON.stringify(args)}`);
        const result = await originalMethod.apply(this, args);
        return result;
      }
      catch (e) {
        await logger.error(tag, e.message);
        throw e;
      }
    };
    return descriptor;
  };
}