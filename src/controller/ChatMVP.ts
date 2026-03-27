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
import z, { array } from "zod";
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

	private isSessionValid(sessionId: SessionId) {
		return this.dialogEngineStateStorage.has(sessionId)
	}

	constructor() {
		this.dialogEngineStateStorage = new Map();
		this.dbClient = PersistanceChatClient.get_instance();
		this.queue = new DynamicQueue<ControllerJob>(async (props) => {
			const { ws, payload } = props
			const { sessionId } = ws.data;
			type ResponseCode = 200 | 300 | 400 | 500 | 501;
			// Meaning of each code:
			// 200 - all ok
			// 300 - 
			// 400
			// 500 - interl error in the msg processing
			// 501 - session endend
			let code: ResponseCode = 200;

			if (!this.isSessionValid(sessionId)) {
				//ws.close()
			}

			if (typeof payload !== 'string') return;

			let clientMsg = JSON.parse(payload) as MsgFromClient;

			// this has to be here because when i read the chat 
			// history in the dialog engine i need all the messages
			this.dbClient.save_msg(sessionId, clientMsg.text, 1); // 1 = humano

			let dialogEngine;
			try {
				dialogEngine = await this.useDialogEngine(sessionId);
				// undefined == there are no more steps
				if (!dialogEngine) {
					ws.close()
				}
			} catch (error) {
				ws.send(JSON.stringify({
					type: "msg",
					code: 500,
					text: 'there was an interal error',
					timestamp: new Date().toISOString()
				}));
			}

			// TODO this error handling has to be improved 
			// with some status or somthing so the client can effectively comunicate the user that 
			// somwthing went wroing with the server 
			const errorMsg = "there is an internal error"
			const aiResponse = dialogEngine ? dialogEngine : errorMsg;
			if (!dialogEngine) code = 500;

			this.dbClient.save_msg(sessionId, aiResponse, 0); // 0 = IA
			/// TODO comunicate with the client when a sesseion is complete so it create a new sessionId
			// well i have to think about it becausde in the future i dont have control over the client status
			// so everithing has to happend in the server 
			// 
			// you can use the util fn isThisSessionComplete to make sure that this session is valid 
			// or you should refreshe with a new session 


			ws.send(JSON.stringify({
				type: "msg",
				code: code,
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


	private isThisSessionComplete(dialogEngine: DialogEngine, sessionId: string) {
		if (dialogEngine.getCurrentDialogState().isFlowComplete === true) {
			this.deleteState(sessionId)
			return true
		}
		return false
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
				const stateAfterExecuteAction = dialogEngine.excuteCurrentStep(initialState)
				llm_response = await getLLMResponseForStep(
					chatHistory,
					stateAfterExecuteAction,
					initialStepProperties
				);

				this.isThisSessionComplete(dialogEngine, sessionId)
				return llm_response;
			case "LINK":
			case "NEXT":
			default:
				// can not happend
				// TODO trow an error here i guess then 
				break;
		}

		if (!updatedState) return // the flow is comleted, there are no next steps

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

		this.isThisSessionComplete(dialogEngine, sessionId)
		return llm_response;
	}
}

// Export a single instance (Singleton) to use in your Bun.serve


export const chatController = new ChatController();
