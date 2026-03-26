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
import { SlotTypes } from "../core/BussinesLogicParser/types";
import type { ActionStepProperties, StepPropertyTypes } from "../core/BussinesLogicTransformer/types";

export const createChatBuffer = (
	chatHistory: ResponseInput[],
	content: string
): ResponseInput[] => {
	return [
		...chatHistory,
		{
			role: 'developer',
			content: content,
		},
	];
};

function getResSructure(slotType: SlotTypes) {
	let valueType;
	switch (slotType) {
		case 'string':
			valueType = z.string().nullable().describe('');
			break;
		case "number":
			valueType = z.number().nullable().describe('');
			break;
		case "boolean":
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
			//console.log('already exists', sessionId);
		}

		return state;
	}

	private saveState(sessionId: SessionId, state: DialogEngineState) {
		this.dialogEngineStateStorage.set(sessionId, state)
	}

	private deleteState(sessionId: SessionId) {
		this.dialogEngineStateStorage.delete(sessionId)
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

			// TODO when i delete the sessionId in the useDialogEngine 
			// i have to handdle that becaus then im just sendding undefined
			const dialogEngine = sessionId;
			//await this.useDialogEngine(sessionId);
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

		// Setup process
		let llmClient = new LLmProviderManager({ model: llmModelToBeUse });
		let dialogEngine = new DialogEngine(workflowToBeUse);
		let initialStepProperties = dialogEngine.getCurrentStepDetail(); // step when i start the proces
		let chatHistory = this.parseMsgsForLlm(sessionId);
		initialState.chatHistory = chatHistory;
		let updatedState: DialogEngineState | undefined;
		let llm_response: string = "";

		// Understanding process
		switch (initialStepProperties.type) {
			case "COLLECT":
				// TODO merge responsePromt and undertandingPromt into one util(fn)
				const collectPromt = chatUndertanding(initialState, initialStepProperties)

				const extractedParam = await llmClient.askLLm(
					createChatBuffer(chatHistory, collectPromt),
					getResSructure(initialStepProperties.slotType)
				);

				const { value } = JSON.parse(extractedParam.output_text);
				updatedState = dialogEngine.excuteCurrentStep({ ...initialState, collectedData: value })

				this.saveState(sessionId, updatedState)
				break;
			case "ACTION":
				/// to be reviewed what happends here...
				//
				//if there are not instructions for the llm in the state then 
				//execute the actiont whateveer is here
				//
				//for now i dont have 2 actions consecutive, do dont worry but that is a big issue
				break;
			case "LINK":
			case "NEXT":
			default:
				// can not happend
				// TODO trow an error here i guess then 
				break;
		}

		// TODO impliment error handling here for possible error here
		if (!updatedState) return // this is an error

		// Responding process
		const updatedStepProperties = dialogEngine.getCurrentStepDetail();

		async function getLLMResponseForStep(
			chatHistory: ResponseInput[],
			dialogState: DialogEngineState,
			stepProperties: StepPropertyTypes
		) {
			const { output_text } = await llmClient
				.askLLm(createChatBuffer(
					chatHistory,
					getResponsePromt(dialogState, stepProperties)
				));
			return output_text;
		}

		switch (updatedStepProperties.type) {
			case "COLLECT":
				const res = await getLLMResponseForStep(
					chatHistory,
					updatedState,
					updatedStepProperties)
				llm_response = res;
				break;
			case "ACTION":
				const stateAfterExecuteAction = dialogEngine.excuteCurrentStep(updatedState)
				llm_response = await getLLMResponseForStep(
					chatHistory,
					stateAfterExecuteAction,
					updatedStepProperties);
				break;
			case "LINK":
			case "NEXT":
			default:
				// can not happend
				break;
		}

		if (dialogEngine.getCurrentDialogState().isFlowComplete) {
			this.deleteState(sessionId)
		}

		return llm_response;
	}
}

// Export a single instance (Singleton) to use in your Bun.serve
export const chatController = new ChatController();
