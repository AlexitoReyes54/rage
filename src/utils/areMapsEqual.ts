// made by ia gemini
export default function areMapsEqual<K, V>(map1: Map<K, V>, map2: Map<K, V>): boolean {
	// 1. Check size first (instant fail)
	if (map1.size !== map2.size) return false;

	// 2. Check keys and values
	for (const [key, val] of map1) {
		const testVal = map2.get(key);

		// Check if the key exists (in case the value is undefined)
		// and if the values match
		if (testVal !== val || (testVal === undefined && !map2.has(key))) {
			return false;
		}
	}

	return true;
}
