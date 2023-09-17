/**
 * Simple object check.
 */
export function isObject(item: any): item is object {
	return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * Deep merge two objects.
 * copied from https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
 */
export function mergeDeep<T>(target: T, ...sources: Array<Partial<T>>): T {
	if (!sources.length) return target;
	const source = sources.shift();

	if (isObject(target) && isObject(source)) {
		for (const key in source) {
			if (isObject(source[key])) {
				if (!target[key]) Object.assign(target, { [key]: {} });
				mergeDeep(target[key], source[key] ?? {});
			} else {
				Object.assign(target, { [key]: source[key] });
			}
		}
	}

	return mergeDeep(target, ...sources);
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
