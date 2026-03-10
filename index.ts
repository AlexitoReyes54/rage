// lets test the implementation for setting all the yaml files
import { readdir } from "node:fs/promises";
import BussinesLogicTransformer from "./src/core/BussinesLogicTransformer/BussinesLogicTransformer";
import AppError from "./src/core/Errors/AppError";
import LLmProviderManager, { type ResponseInput } from "./src/core/LlmProviderManager/LlmProviderManager";
import z from "zod";
import createResponseRephraserPrompt from "./src/core/LlmProviderManager/promts/responseRephraser";
import DialogEngine, { type CollectParam } from "./src/core/DialogEngine/DialogEngine";
import { bussinesLogicFile } from "./src/core/BussinesLogicParser/types";
import visualizeWorkflow from "./src/core/StateMachine/utils/visualizeWorkflow";

import { COLLECT } from "./src/core/BussinesLogicParser/types";


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
		console.log(e);
		throw new AppError('error loading the flow files')
	})

	let workflows = BussinesLogicTransformer.getWorkflowsMapStore()
	let stepsInfo = BussinesLogicTransformer.getAllWorkflowsStepsInfo()
	let machine = BussinesLogicTransformer.getStateMachinesMapStore()

	let medicalMachine = machine.get('medical');
	let medicalSTepsInfo = stepsInfo['medical'];
	let s = medicalMachine?.getCurrentState() as string;

	//console.log(flowSTepsInfo?.steps[s]);
	//console.log(workflows.get('flow'));

	// the dialog engine has to have a a spesific state flow 
	// what flos is going to use
	// flow state machine if there is any 
	// understandinf params if any 
	let flowToUse = 'medical';
	let dialog = new DialogEngine(flowToUse);
	let props: CollectParam = {
		collectedData: 'sample',
		type: 'COLLECT'
	}
	dialog.excuteCurrentStep(props);

	// this is a controller

	// get data logic
	// parse somtheing 
	// use undertanding...
	// use dialog 
	// generate response 
	// send response to client (whatsapp)
	// i need a database for the state of the information
	// the code just executes 
	// how i can keep track of the dialog state and state machine status

	// what this needs as input???
	// state machine to know what to track 
	// detail to know what each state means 

	// what is the output ? 
	// instruction for the parser 
	// current snapshot of the sate machine 
	// if needed responde of executed actions
	// what should be it for now

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
