export function hasDuplicates<T>(arr: T[]) {
	return new Set(arr).size !== arr.length;
}
