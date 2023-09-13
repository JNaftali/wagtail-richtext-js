export function extend<T extends { [key: string]: any }>(
	obj: T,
	...others: Partial<T>[]
): T {
	return Object.fromEntries(
		Object.entries(obj).map(([key, value]) => {
			let newValue = value;
			for (let other of others) {
				if (key in other) {
					newValue = other[key];
				}
			}
			return [key, newValue];
		}),
	) as any;
}
