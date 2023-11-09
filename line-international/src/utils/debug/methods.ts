const defaultExcludes = ['constructor', '__defineGetter__', '__defineSetter__', 'hasOwnProperty', '__lookupGetter__', '__lookupSetter__', 'isPrototypeOf', 'propertyIsEnumerable', 'toString', 'valueOf', '__proto__', 'toLocaleString', 'apply', 'call', 'bind'];

export function getAllMethodNames(obj: any, depth = Infinity, exclude = []) {
  exclude = exclude.concat(defaultExcludes);
  const methods = new Set();
  while (depth-- && obj) {
    for (const key of Reflect.ownKeys(obj)) {
      if (typeof key === 'string' && key !== 'constructor') {
        const desc = Object.getOwnPropertyDescriptor(obj, key);
        if (desc && !desc.get && !desc.set && typeof desc.value === 'function') {
          methods.add(key);
        }
      }
    }
    obj = Reflect.getPrototypeOf(obj);
  }
  for (const key of exclude) {
    methods.delete(key);
  }

  return methods as Set<string>;
}

export function getAllPropertyNames(obj: any, depth = Infinity, exclude = []) {
  exclude = exclude.concat(defaultExcludes);
  const properties = new Set();
  while (depth-- && obj) {
    for (const key of Reflect.ownKeys(obj)) {
      if (typeof key === 'string' && key !== 'constructor') {
        const desc = Object.getOwnPropertyDescriptor(obj, key);
        if (desc && !desc.get && !desc.set && typeof desc.value !== 'function') {
          properties.add(key);
        }
      }
    }
    obj = Reflect.getPrototypeOf(obj);
  }
  for (const key of exclude) {
    properties.delete(key);
  }

  return properties as Set<string>;
}