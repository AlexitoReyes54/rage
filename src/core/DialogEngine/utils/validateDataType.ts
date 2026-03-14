export default function validateDataType(collectedData: any, expectedDataType: 'number' | 'string' | 'boolean') {
	let typeOfCollectedData = typeof collectedData;
	return typeOfCollectedData === expectedDataType ? true : false;
}
