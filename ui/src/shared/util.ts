export function posmod(n: number, d: number) { return ((n % d) + d) % d }

export function* enumerate<T>(iterable: Iterable<T>) {
	let i = 0;
	for (const x of iterable) {
		yield [x, i++] as [T, number];
	}
}

export function assertUnreachable(a: never): never {
  throw new Error(`Deliberately unreachable case occurred: ${a}`);
}
