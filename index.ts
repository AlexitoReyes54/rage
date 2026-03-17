import { readdir } from "node:fs/promises";
import BussinesLogicTransformer from "./src/core/BussinesLogicTransformer/BussinesLogicTransformer";
import AppError from "./src/core/Errors/AppError";
import LLmProviderManager, { type ResponseInput } from "./src/core/LlmProviderManager/LlmProviderManager";
import z from "zod";
import DialogEngine from "./src/core/DialogEngine/DialogEngine";

import { bussinesLogicFile } from "./src/core/BussinesLogicParser/types";
import visualizeWorkflow from "./src/core/StateMachine/utils/visualizeWorkflow";

import type { CollectParam, DialogEngineState } from "./src/core/DialogEngine/types";
import type StateMachine from "./src/core/StateMachine/StateMachine";
import { undertandingPromt } from './src/core/LlmProviderManager/promts/undertandingPromt'
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
		content: 'i need help with my medical date, my name as a patient is juan soto '
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
	let stepProperty = dialogEngine.getCurrentStepDetail();

	let dState = dialogEngine.excuteCurrentStep(state);

	console.log("initial state: ", dState.stateMachine?.getCurrentState());
	let undertandPromt = chatUndertanding(state, stepProperty)
	//let valueType = getValueType();

	// TODO this has to be reviewed, the return value types depends on the slot i want to collect it can not be a general string for everithing 
	const c = z.object({
		// how i know the type i need to know the type in any ????yy
		value: z.string().nullable().describe('how to add zod descriptions to the object values'),
	});

	let llmProviderManager = new LLmProviderManager({
		model: 'gpt-4o-2024-08-06'
		//model: 'gpt-5-mini'
	});

	let chatHistoryBuffer = chatHistory;

	chatHistoryBuffer.push({
		role: 'developer',
		content: undertandPromt
	})


	let res_x = await llmProviderManager.askLLm(chatHistoryBuffer, c);
	let llm_response_obj = JSON.parse(res_x.output_text);
	console.log(llm_response_obj);


	let last_state: DialogEngineState = { ...dState, collectedData: llm_response_obj.value }
	let new_state = dialogEngine.excuteCurrentStep(last_state)


	// responding 
	new_state // represent current state
	let curr_step_properties = dialogEngine.getCurrentStepDetail();
	let response_promt = getResponsePromt(new_state, curr_step_properties);

	let res_chatHistoryBuffer = chatHistory;
	res_chatHistoryBuffer.push(response_promt)

	let final_response = await llmProviderManager.askLLm(res_chatHistoryBuffer);
	
	// add response to the chat history
	// send data to the chat 
	
	console.log(final_response.output_text);

	// gen promt with somtehing like chatUndertanding but for responds(using the curr step data, to send instrcuctions ) -- complex
	// send msg to chat-- simple


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
}

run();
