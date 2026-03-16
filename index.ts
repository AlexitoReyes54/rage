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
import { undertandingPromt } from './src/core/LlmProviderManager/promts/undertandingPromt'
import { setMaxIdleHTTPParsers } from "node:http";
import type { StepPropertyTypes } from "./src/core/BussinesLogicTransformer/types";

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

let chatHistory: ResponseInput[] = [
	{
		role: 'user',
		content: 'hello how are you ? '
	},
	{
		role: 'assistant',
		content: 'hello how can helo you today ?'
	},
	{
		role: 'user',
		content: 'i need help with my medical date'
	},
]


function buildParsingPromt(params: {
	history: string;
	instructions: string;
}) {
	let prompt = undertandingPromt;
	prompt = prompt
		.replace("{{history}}", params.history)
		.replace("{{instructions}}", params.instructions);
	return prompt;
}


// TODO this requires a complete implementation implementation
function getStepInstructions(stepProperty: StepPropertyTypes) {
	switch (stepProperty.type) {
		case 'ACTION':
			break;
		case "COLLECT":
			let collectInstructions = `
your job it to collect to celllect the {{slot}}, 
consdier this: {{note}}
the data type is {{dataType}}
`
			return collectInstructions
				.replace("{{slot}}", stepProperty.slotName)
				.replace("{{note}}", stepProperty.note || '')
				.replace("{{dataType}}", stepProperty.slotType);
		case "LINK":
		case "NEXT":
		default:
			return '';
	}

	return '';
}

function formatHistoryIntoText(chathistory: ResponseInput[]): string {
	return chathistory.map(msg => {
		return msg.role === 'user' ? `U: ${msg.content}` : `B: ${msg.content}`
	}).join('\n');
}

const chatUndertanding = (dialogEngineState: DialogEngineState, stepProperty: StepPropertyTypes): string => {
	let output = { ...dialogEngineState }

	if (!dialogEngineState.chatHistory) {
		return '';
	}

	let textChatHistory = formatHistoryIntoText(dialogEngineState.chatHistory)
	let instructions = getStepInstructions(stepProperty);
	let promt = buildParsingPromt({
		history: textChatHistory,
		instructions: instructions
	});

	return promt;
}

function getValueType(type: any) {
	return z.string();
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

	let state: DialogEngineState = {
		collectedData: '',
		chatHistory: chatHistory
	}

	let flowToUse = 'medical';
	let dialogEngine = new DialogEngine(flowToUse);
	// get current engine state
	let stepProperty = dialogEngine.getCurrentStepDetail();

	// exevute engine - can update state
	let dState = dialogEngine.excuteCurrentStep(state);

	console.log(dState.instructionsForLlm);
	let undertandPromt = chatUndertanding(state, stepProperty)
	//let valueType = getValueType();

	const c = z.object({
		// how i know the type i need to know the type in any ????yy
		value: z.string().nullable().describe('how to add zod descriptions to the object values'),
	});

	let llmProviderManager = new LLmProviderManager({
		//model: 'gpt-4o-2024-08-06'
		model: 'gpt-5-mini'

	});

	chatHistory.push({
		role: 'developer',
		content: undertandPromt
	})

	console.log(undertandPromt);

	let x = await llmProviderManager.askLLm(chatHistory, c);
	console.log(x.output_text);

	// 1. i have the promt --done
	// 2. i have the response structure -- soft done
	// 3. i have request the llm -- done 
	// 4. send response to the engine -- done 


	//	let res = dialogEngine.excuteCurrentStep(state);

	//	if (res.stateMachine) {
	//		printCurrentStepName(res.stateMachine)
	//		let instructions = generateInstructions(res)
	//		console.log(instructions);
	//	}


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


	//let x = await llmProviderManager.askLLm(inputs);
	//let x = await llmProviderManager.askLLm(inputs, CalendarEvent);
	//console.log(x.output_text);
}

run();
