// execute fn once and debounce callback
export function debounceCb(fn: () => void, wait: number, cb: () => void) {
	let timeoutId = -1;
	return () => {
		fn();
		window.clearTimeout(timeoutId);
		timeoutId = window.setTimeout(cb, wait)
	}
}
