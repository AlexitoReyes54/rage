// lets test the implementation for setting all the yaml files
import { readdir } from "node:fs/promises";
import BussinesLogicTransformer from "./src/core/BussinesLogicTransformer/BussinesLogicTransformer";
import AppError from "./src/core/Errors/AppError";
import LLmProviderManager, { type ResponseInput } from "./src/core/LlmProviderManager/LlmProviderManager";
import z from "zod";

async function run() {
	//const files = await readdir('./flows');

	//await Promise.all(files.map(async (file) => {
	//let currentFileContent = await Bun.file(`./flows/${file}`).text();
	//let fileName = file.split(".")[0];
	//if (!fileName) {
	//throw new AppError('some flow file has not the right format ')
	//}
	//BussinesLogicTransformer.loadYamlIntoMemory(fileName, currentFileContent);
	//})).catch(e => {
	//throw new AppError('error loading the flow files')
	//})

	//let list = BussinesLogicTransformer.getLogicStorate()
	//let ref = BussinesLogicTransformer.getReferenceNodeInfo()

	const CalendarEvent = z.object({
		name: z.string(),
		date: z.string(),
		participants: z.array(z.string()),
	});

	let llmProviderManager = new LLmProviderManager({
		//model: 'gpt-3.5-turbo'
		model: 'gpt-4o-2024-08-06'
	});

	let inputs: ResponseInput[] = [
		{
			role: 'user',
			content: 'are you good at coding ? '
		},
	]

	let x = await llmProviderManager.askLLm(inputs, CalendarEvent);
	console.log(x.output_text);
}

run();
