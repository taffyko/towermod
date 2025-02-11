import { useMiniEventValue } from "@/util/hooks";
import { MiniEvent } from "@/util/util";

let timeout = 0;
export function spin<T extends Function>(fn: T): T
export function spin<T>(promise: Promise<T>): Promise<T>
export function spin(promiseOrFn: any): any {
	if (typeof promiseOrFn === 'function') {
		return (...args: any[]) => spin(promiseOrFn(...args))
	} else {
		const promise = promiseOrFn;
		promises = [...promises]
		promises.push(promise)
		promisesUpdated.fire(promises)
		promise.finally(() => removePromise(promise))
		clearTimeout(timeout)
		timeout = window.setTimeout(() => {
			promises = []
			promisesUpdated.fire(promises)
		}, 60000)
		return promise
	}
}

function removePromise(promise: Promise<unknown>) {
	const idx = promises.indexOf(promise)
	if (idx === -1) return;
	promises = [...promises]
	promises.splice(idx, 1)
	promisesUpdated.fire(promises)
}

export function useIsSpinning() {
	const promises = useMiniEventValue(promisesUpdated);
	return !!promises.length;
}

/** @internal */
let promises: Promise<unknown>[] = [];
/** @internal */
export const promisesUpdated = new MiniEvent(promises);
