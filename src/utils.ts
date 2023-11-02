/**
 * Simple object check.
 */
export function isObject(item: any): item is object {
	return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * Take from an array until condition returns true. Modifies the array, returns elements removed from the array
 */
export function takeUntil<T>(
	condition: (x: T) => boolean,
	arr: Array<T>,
): Array<T> {
	const i = arr.findIndex(condition);
	if (i === -1) return arr.splice(0);
	return arr.splice(0, i);
}
