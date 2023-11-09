// requires decorator that runs a function before the method is called
export function Requires<T extends (...args: any) => any>(method: (...args: any) => any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    if (!method) throw new Error('Method cannot be null');
    if (!originalMethod || typeof originalMethod != 'function') throw new Error('Original method is not a function');


    // wrap the original method with a new method that caches the result
    descriptor.value = async function (...args: ArgumentsType<T>) {
      await method.apply(target, args);
      return originalMethod.apply(this, args);
    };
    return descriptor;
  };
}