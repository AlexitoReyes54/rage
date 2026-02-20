// lets test the implementation for setting all the yaml files

import { readdir } from "node:fs/promises";
import BussinesLogicTransformer from "./src/core/BussinesLogicTransformer/BussinesLogicTransformer";
import AppError from "./src/core/Errors/AppError";

async function run() {
	const files = await readdir('./flows');

	await Promise.all(files.map(async (file) => {
		let currentFileContent = await Bun.file(`./flows/${file}`).text();
		let fileName = file.split(".")[0];
		if (!fileName) {
			throw new AppError('some flow file has not the right format ')
		}
		BussinesLogicTransformer.loadYamlIntoMemory(fileName, currentFileContent);
	})).catch(e => {
		throw new AppError('error loading the flow files')
	})

	let list = BussinesLogicTransformer.getLogicStorate()
	let ref = BussinesLogicTransformer.getReferenceNodeInfo()

	ref.forEach((item, index) => {
		//console.log(item);
	})

}

run();
