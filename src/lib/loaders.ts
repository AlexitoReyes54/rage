import { readdir } from "node:fs/promises";
import BussinesLogicTransformer from "../../src/core/BussinesLogicTransformer/BussinesLogicTransformer";
import AppError from "../../src/core/Errors/AppError";

export default async function loadAllYmlFiles() {
	const files = await readdir('./flows');

	await Promise.all(files.map(async (file) => {
		let currentFileContent = await Bun.file(`./flows/${file}`).text();
		let fileName = file.split(".")[0];
		if (!fileName) {
			throw new AppError('some flow file has not the right format ')
		}
		if (currentFileContent === undefined) {
			console.log(fileName);
		}
		if (fileName === 'medical') {
			BussinesLogicTransformer.loadYamlIntoMemory(fileName, currentFileContent);
		}
	})).catch(e => {
		console.log(e);
		throw new AppError('error loading the flow files')
	}).then(_ => {
		console.log('All YML files loaded successfully');
	})
}

