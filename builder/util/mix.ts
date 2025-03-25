export function objectMix <A extends object, B extends object>(obj1: A, obj2: B): A & B;
export function objectMix (...objs: object[]): object;
export function objectMix (...objs: object[]) {
  const proxy = new Proxy({}, {
    get(_target, prop: string, receiver) {
      let found = null;
      for (const obj of objs) {
        const result = Reflect.get(obj, prop, receiver);
        if (result && found)
          throw new Error(`Two or more of source objects have the "${prop}" property`);
        if (result) found = result;
      }
      if (found) return found;
      for (const obj of objs) {
        const result = Reflect.get(Object.getPrototypeOf(obj), prop, receiver);
        if (result && found)
          throw new Error(`Two or more of source objects have the "${prop}" property in their prototype`);
        if (result) found = result;
      }
      /**
      if (typeof result === 'function') return function (...args) {
        console.log({objs, proxy, _target, receiver, prop, args});
        const retVals: unknown[] = [];
        for (const obj of objs) {
          const ref = Reflect.get(obj, prop, receiver)
            ?? Reflect.get(Object.getPrototypeOf(obj), prop, receiver);
          if (typeof ref === 'function') {
            retVals.push(Reflect.apply(ref, this, args));
          }
        }
        if (retVals.some(val => val instanceof Promise)) {
          return Promise.all(retVals).then(awaitedVals => {
            const filteredVals = awaitedVals.filter(
              (val): val is object => !!val && typeof val === 'object'
            );
            if (filteredVals.length === 1) return filteredVals[0];
            if (filteredVals.length > 1) return objectMix(...filteredVals);
          });
        }
        const filteredVals = retVals.filter((val): val is object => !!val && typeof val === 'object');
        if (filteredVals.length === 1) return filteredVals[0];
        if (filteredVals.length > 1) return objectMix(...filteredVals);
      };
      /**/
      if (found) return found;
    },
    has(_target, prop) {
      return objs.some(obj => prop in obj || prop in Object.getPrototypeOf(obj));
    },
    setPrototypeOf() {
      throw new Error('Modification du prototype interdite');
    }
  });
  return proxy;
}
