import { useMiniEventValue } from "@/util/hooks";
import { MiniEvent } from "@/util/util";

export function spin<T>(promise: Promise<T>): Promise<T> {
	promises = [...promises]
	promises.push(promise)
	promisesUpdated.fire(promises)
	promise.then(() => removePromise(promise))
	return promise
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
