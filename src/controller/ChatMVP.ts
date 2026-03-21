import DialogEngine from "../core/DialogEngine/DialogEngine";
import DynamicQueue from "../utils/DynamicQueue";
import PersistanceChatClient from "../persistance/sqliteClient";
import chatUndertanding from "../utils/promts/chatUndertanding";
import getResponsePromt from "../utils/promts/getResponsePromt";

// ================= dialog engine usage import =================
import { Message } from './../persistance/sqliteClient';
import BussinesLogicTransformer from "./src/core/BussinesLogicTransformer/BussinesLogicTransformer";
import AppError from "./src/core/Errors/AppError";
import LLmProviderManager, { type ResponseInput } from "../core/LlmProviderManager/LlmProviderManager";
import z from "zod";
import { bussinesLogicFile } from "./src/core/BussinesLogicParser/types";
import visualizeWorkflow from "./src/core/StateMachine/utils/visualizeWorkflow";
import type { DialogEngineState } from "./../core/DialogEngine/types";
import type StateMachine from "../../src/core/StateMachine/StateMachine";
import { undertandingPromt } from './src/core/LlmProviderManager/promts/undertandingPromt'
import { responsePromt } from './src/core/LlmProviderManager/promts/responsePromt'
import type { StepPropertyTypes } from "./src/core/BussinesLogicTransformer/types";
import { SlotTypes } from "../core/BussinesLogicParser/types";

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


const ChatResponseStructure = z.object({
	value: z.string().nullable().describe('how to add zod descriptions to the object values'),
});

function getResSructure(slotType: SlotTypes) {
	let valueType;
	switch (slotType) {
		case 'string':
			console.log('string struc');
			valueType = z.string().nullable().describe('');
			break;
		case "number":
			valueType = z.number().nullable().describe('');
			break;
		case "boolean":
			console.log('bool struc');
			valueType = z.boolean().nullable().describe('');
			break;
		default:
			valueType = z.string().nullable().describe('');
			break;
	}
	console.log(slotType);

	return z.object({
		value: valueType,
	});
}

export type WebSocketData = {
	sessionId: string
};

interface ControllerJob {
	ws: Bun.ServerWebSocket<WebSocketData>;
	payload: Buffer<ArrayBuffer> | string;
}

interface MsgFromClient {
	text: string;
}

type SessionId = string;

class ChatController {
	private queue: DynamicQueue<ControllerJob>;
	private dbClient: PersistanceChatClient;
	private dialogEngineStateStorage: Map<SessionId, DialogEngineState>;

	private getOrCreateState(sessionId: SessionId): DialogEngineState {
		let state = this.dialogEngineStateStorage.get(sessionId);

		if (!state) {
			console.log('created thin run', sessionId);

			let chatHistory = this.parseMsgsForLlm(sessionId);
			state = { chatHistory } as DialogEngineState; // O new DialogEngineState() si es clase
			this.dialogEngineStateStorage.set(sessionId, state);
		} else {
			console.log('already exists', sessionId);
		}

		return state;
	}

	private saveState(sessionId: SessionId, state: DialogEngineState) {
		this.dialogEngineStateStorage.set(sessionId, state)
	}

	constructor() {
		this.dialogEngineStateStorage = new Map();
		this.dbClient = PersistanceChatClient.get_instance();
		this.queue = new DynamicQueue<ControllerJob>(async (props) => {
			const { ws, payload } = props
			const { sessionId } = ws.data;

			if (typeof payload !== 'string') return;

			let clientMsg = JSON.parse(payload) as MsgFromClient;

			// this has to be here because when i read the chat 
			// history in the dialog engine i need all the messages
			this.dbClient.save_msg(sessionId, clientMsg.text, 1); // 1 = humano

			// TODO implement dialog engine
			const dialogEngine = await this.useDialogEngine(sessionId);
			let aiResponse = dialogEngine;

			this.dbClient.save_msg(sessionId, aiResponse, 0); // 0 = IA

			ws.send(JSON.stringify({
				type: "msg",
				text: aiResponse,
				timestamp: new Date().toISOString()
			}));
		});
	}

	async onMessage(ws: Bun.ServerWebSocket<WebSocketData>, payload: Buffer<ArrayBuffer> | string) {
		try {
			this.queue.enqueue({ ws, payload })
		} catch (err) {
			console.error("Controller Error:", err);
			ws.send(JSON.stringify({ error: "Invalid message format" }));
		}
	}


	private parseMsgsForLlm(sessionId: string): ResponseInput[] {
		const chatHistoryFromDB = this.dbClient.get_all_session_msgs(sessionId)
		if (chatHistoryFromDB.length === 0) return [];
		let res: ResponseInput[] = chatHistoryFromDB.map((item) => {
			return {
				content: item.text,
				role: item.is_human ? 'user' : 'assistant'
			}
		});
		return res;
	}

	// TODO this fn requires a try catch block, many things can go wrong here
	private async useDialogEngine(sessionId: string) {
		const workflowToBeUse = 'medical';
		const llmModelToBeUse = 'gpt-4o-2024-08-06';

		let initialState: DialogEngineState = this.getOrCreateState(sessionId)
		let llmClient = new LLmProviderManager({ model: llmModelToBeUse });
		let dialogEngine = new DialogEngine(workflowToBeUse);
		let initialStepProperties = dialogEngine.getCurrentStepDetail();
		let chatHistory = this.parseMsgsForLlm(sessionId);
		initialState.chatHistory = chatHistory;
		let undertandPromt = chatUndertanding(initialState, initialStepProperties)

		let undertandChatHistoryBuffer: ResponseInput[] = [...chatHistory, { role: 'developer', content: undertandPromt }];

		// ChatResponseStructure has to have a dinamyc type for the collected value from the chat
		let slotStuctureType = initialStepProperties.type === 'COLLECT' ? getResSructure(initialStepProperties.slotType) : ChatResponseStructure;
		let extractedParams = await llmClient.askLLm(undertandChatHistoryBuffer, slotStuctureType);

		let structuedOutput = JSON.parse(extractedParams.output_text);
		let updatedState = dialogEngine.excuteCurrentStep({ ...initialState, collectedData: structuedOutput.value })
		this.saveState(sessionId, updatedState)

		// this is debbuging
		let v = initialStepProperties.type === 'COLLECT' ? initialStepProperties : null
		if (v) {
			printCurrentStepName(updatedState.stateMachine);
		}

		// responding 
		let updatedStepProperties = dialogEngine.getCurrentStepDetail();
		let responsePromt = getResponsePromt(updatedState, updatedStepProperties);

		let responseChatHistoryBuffer: ResponseInput[] = [...chatHistory, { role: 'developer', content: responsePromt }];

		let res = await llmClient.askLLm(responseChatHistoryBuffer);
		let llm_msg = res.output_text;
		return llm_msg;
	}
}

// Export a single instance (Singleton) to use in your Bun.serve
export const chatController = new ChatController();
