import { DeepReadonly } from 'ts-essentials';

// Take from https://stackoverflow.com/a/48244432
export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> &
  U[keyof U];

/* object deep freeze function */
export function deepFreeze<T>(object: T): DeepReadonly<T> {
  /* retrieve the property names defined on object */
  const propNames = Object.getOwnPropertyNames(object);

  /* recursively freeze properties before freezing self */
  for (const name of propNames) {
    // TODO: check TS problems with indexing object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (object as any)[name];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (object as any)[name] =
      value && typeof value === 'object' ? deepFreeze(value) : value;
  }

  /* return frozen object */
  return Object.freeze(object) as DeepReadonly<T>;
}
