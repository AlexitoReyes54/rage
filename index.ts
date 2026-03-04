// lets test the implementation for setting all the yaml files
import { readdir } from "node:fs/promises";
import BussinesLogicTransformer from "./src/core/BussinesLogicTransformer/BussinesLogicTransformer";
import AppError from "./src/core/Errors/AppError";
import LLmProviderManager, { type ResponseInput } from "./src/core/LlmProviderManager/LlmProviderManager";
import z from "zod";
import createResponseRephraserPrompt from "./src/core/LlmProviderManager/promts/responseRephraser";
import DialogEngine from "./src/core/DialogEngine/DialogEngine";
import { bussinesLogicFile } from "./src/core/BussinesLogicParser/types";

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

	let work_workflow = list.get("flow");

	let ref = BussinesLogicTransformer.getReferenceNodeInfo()
	console.log(ref['flow']);

	let machine = BussinesLogicTransformer.transformIntoStateMachine(work_workflow)
	//console.log(machine);

	let dialog = new DialogEngine(machine);

	const CalendarEvent = z.object({
		name: z.string(),
		date: z.string(),
		participants: z.array(z.string()),
	});

	let llmProviderManager = new LLmProviderManager({
		//model: 'gpt-3.5-turbo'
		model: 'gpt-4o-2024-08-06'
	});

	let p = createResponseRephraserPrompt({
		topic: 'programacion',
		concept: 'lua'
	})
	//console.log(p);

	let inputs: ResponseInput[] = [
		{
			role: 'user',
			content: p
		},
	]




	//let x = await llmProviderManager.askLLm(inputs);
	//let x = await llmProviderManager.askLLm(inputs, CalendarEvent);
	//console.log(x.output_text);
}

run();
