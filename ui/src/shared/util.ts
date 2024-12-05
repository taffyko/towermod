export function posmod(n: number, d: number) { return ((n % d) + d) % d }
import { Slice } from '@reduxjs/toolkit'

export function* enumerate<T>(iterable: Iterable<T>) {
	let i = 0;
	for (const x of iterable) {
		yield [x, i++] as [T, number];
	}
}

export function assertUnreachable(a: never): never {
	throw new Error(`Deliberately unreachable case occurred: ${a}`);
}

export function assert(value: false): never
export function assert<T>(value: T, msg?: string): NonNullable<T>
export function assert(condition: unknown, msg?: string): asserts condition
export function assert(condition: unknown, msg?: string) {
	if (!condition) { throw new Error(msg ?? "Assertion failed") }
	return condition
}

/** Add reducers without immer.js to a redux-toolkit slice */
export function addRawReducers<S>(
  slice: Slice<S>,
  reducers: Record<string, ((state: S, action: any) => S)>
) {
  const originalReducer = slice.reducer
  const actionMap =
    Object.fromEntries(
      Object.entries(reducers)
      .map(([name, fn]) => [name.includes('/') ? name : `${slice.name}/${name}`, fn]))

  slice.reducer = (state: S | undefined, action: any) => {
    const fn = actionMap[action.type]
    if (fn)
      return fn(state!, action)
    return originalReducer(state, action)
  }
}

export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;
