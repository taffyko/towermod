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

export class MiniEvent<T = void> {
	subscriptions = new Set<(e: T) => void>();
	subscribe(fn: (e: T) => void) {
		this.subscriptions.add(fn)
	}
	unsubscribe(fn: (e: T) => void) {
		this.subscriptions.delete(fn)
	}
	fire(e: T) {
		for (const fn of this.subscriptions) {
			fn(e);
		}
	}
}

export class Timer {
	/** seconds */
	#startTime = 0.0
	#timeLeft = 0.0
	#running = false
	get timeLeft() { return this.#timeLeft }
	set timeLeft(time: number) {
		this.#startTime = time
		this.#timeLeft = time
	}
	get progress() { return 1 - this.#timeLeft / this.#startTime }
	get running() { return this.#running }
	#animationFrame = 0
	/** milliseconds */
	#domTimestamp = performance.now()
	readonly timeoutEvent = new MiniEvent()
	readonly progressEvent = new MiniEvent<number>()
	constructor(time: number) {
		this.timeLeft = time
		this.update()
	}
	update(delta = 0.0) {
		console.log("update", this.#timeLeft); // FIXME
		this.#running = true
		if (this.#timeLeft <= 0) {
			this.stop()
			this.timeoutEvent.fire()
		}
		this.#timeLeft = Math.max(0, this.timeLeft - delta)
		this.progressEvent.fire(this.progress)
		this.#animationFrame = requestAnimationFrame((newDomTimestamp) => {
			const delta = (newDomTimestamp - this.#domTimestamp) / 1000
			this.#domTimestamp = newDomTimestamp
			this.update(delta)
		})
	}
	stop() {
		cancelAnimationFrame(this.#animationFrame)
		this.#running = false
	}
}

export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;

interface Flavoring<FlavorT> {
	_type?: FlavorT;
}
export type Flavor<T, FlavorT> = T & Flavoring<FlavorT>;

declare module "@towermod" {
	export type int = Flavor<number, 'int'>
	export type float = Flavor<number, 'float'>
}
export type { int, float } from "@towermod"
