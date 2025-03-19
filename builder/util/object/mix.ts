export function objectMix <A extends object, B extends object>(obj1: A, obj2: B): A & B;
export function objectMix (...objs: object[]) {
  return new Proxy({}, {
    get(_target, prop, receiver) {
      for (const obj of objs) {
        const result = Reflect.get(obj, prop, receiver);
        if (result) return result;
      }
      for (const obj of objs) {
        const result = Reflect.get(Object.getPrototypeOf(obj), prop, receiver);
        if (result) return result;
      }
    },
    has(_target, prop) {
      return objs.some(obj => prop in obj || prop in Object.getPrototypeOf(obj));
    },
    setPrototypeOf() {
      throw new Error('Modification du prototype interdite');
    }
  });
}
