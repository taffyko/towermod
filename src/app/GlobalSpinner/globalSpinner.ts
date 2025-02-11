import { useMiniEventValue } from "@/util/hooks";
import { MiniEvent } from "@/util/util";

let timeout = 0;
export function spin<T extends Function>(fn: T, noSpinner?: boolean): T
export function spin<T>(promise: Promise<T>, noSpinner?: boolean): Promise<T>
export function spin(promiseOrFn: any, noSpinner?: boolean): any {
	if (typeof promiseOrFn === 'function') {
		return (...args: any[]) => spin(promiseOrFn(...args))
	} else {
		const promise = promiseOrFn;
		const event = noSpinner ? noSpinnerPromisesUpdated : spinnerPromisesUpdated

		const promises = [...event.lastValue!]
		promises.push(promise)
		event.fire(promises)
		promise.finally(() => removePromise(promise))
		clearTimeout(timeout)
		timeout = window.setTimeout(() => {
			event.fire([])
		}, 60000)
		return promise
	}
}

function removePromise(promise: Promise<unknown>) {
	for (const event of [spinnerPromisesUpdated, noSpinnerPromisesUpdated]) {
		let promises = event.lastValue!;
		const idx = promises.indexOf(promise)
		if (idx === -1) continue;
		promises = [...promises]
		promises.splice(idx, 1)
		event.fire(promises)
	}
}

export function useIsSpinning() {
	const spinnerPromises = useMiniEventValue(spinnerPromisesUpdated);
	const noSpinnerPromises = useMiniEventValue(noSpinnerPromisesUpdated);
	return !!spinnerPromises.length || !!noSpinnerPromises.length;
}

/** @internal */
export function useShouldShowSpinner() {
	const promises = useMiniEventValue(spinnerPromisesUpdated);
	return !!promises.length;
}

/** @internal */
export const spinnerPromisesUpdated = new MiniEvent<Promise<unknown>[]>([]);

/** @internal */
export const noSpinnerPromisesUpdated = new MiniEvent<Promise<unknown>[]>([]);


