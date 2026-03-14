// lets test the implementation for setting all the yaml files
import { readdir } from "node:fs/promises";
import BussinesLogicTransformer from "./src/core/BussinesLogicTransformer/BussinesLogicTransformer";
import AppError from "./src/core/Errors/AppError";
import LLmProviderManager, { type ResponseInput } from "./src/core/LlmProviderManager/LlmProviderManager";
import z from "zod";
import createResponseRephraserPrompt from "./src/core/LlmProviderManager/promts/responseRephraser";
import DialogEngine from "./src/core/DialogEngine/DialogEngine";
import { bussinesLogicFile } from "./src/core/BussinesLogicParser/types";
import visualizeWorkflow from "./src/core/StateMachine/utils/visualizeWorkflow";

import { COLLECT } from "./src/core/BussinesLogicParser/types";
import type { CollectParam, DialogEngineState } from "./src/core/DialogEngine/types";
import type StateMachine from "./src/core/StateMachine/StateMachine";
import { log } from "node:console";

//utils 
const generateInstructions = (state: DialogEngineState) => {
	let promt = ``;
	let name = state.stateMachine?.getCurrentState();
	const stepDetail = state.stepsDetailedInfo?.steps[name || ""]

	if (!stepDetail || !name) {
		return;
	}

	console.log(stepDetail);

	switch (stepDetail.type) {

		case 'COLLECT':
			promt = `
				your are a helpful assitant and:

				your missino is to get this value from the user
				${stepDetail.slotName} that is type: ${stepDetail.slotType}

				durint this process is important to: ${stepDetail.nodeDescription}
			`;
			return promt;
		case 'ACTION':
			break;

		default:
			break;
	}
}


const printCurrentStepName = (machine: StateMachine) => {
	let s = machine.getCurrentState();
	let slots = machine.getAllSlots();

	console.log("-=============================-");
	console.log('current step name: ' + s);
	console.log('SLOTS:');
	for (const [key, value] of slots) {
		console.log('     current ' + key + ' value is: ' + value);
	}
	console.log("-=============================-");
}



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

	// where chathistory should happend ???
	// in the db of course 

	let flowToUse = 'medical';
	let dialogEngine = new DialogEngine(flowToUse);

	let state: DialogEngineState = {
		collectedData: 'juan'
	}

	let res = dialogEngine.excuteCurrentStep(state);

	if (res.stateMachine) {
		printCurrentStepName(res.stateMachine)
		let instructions = generateInstructions(res)
		console.log(instructions);
	}


	// this is a controller

	// get data logic
	// 
	// parse somtheing 
	// use undertanding...
	// use dialog 
	// generate response 
	//
	// send response to client (whatsapp)
	// i need a database for the state of the information
	// the code just executes 
	// how i can keep track of the dialog state and state machine status


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
