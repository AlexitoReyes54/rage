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
			console.log('current sessions: ');
			console.log(Array.from(this.dialogEngineStateStorage.keys()));
			const { ws, payload } = props;
			const { sessionId } = ws.data;
			console.log('sessionId actual', sessionId);

			// 1. Wrap the ENTIRE callback in a try-catch to protect the queue from crashing
			try {
				if (typeof payload !== 'string') return;

				// 2. Safely parse the incoming message
				let clientMsg: MsgFromClient;
				try {
					clientMsg = JSON.parse(payload);
				} catch (parseError) {
					ws.send(JSON.stringify({ type: "msg", code: 400, text: "Invalid JSON format" }));
					return; // Stop execution for this job
				}

				// Save the user's message
				this.dbClient.save_msg(sessionId, clientMsg.text, 1);

				// 3. Get AI Response (Note: renamed variable to avoid confusion with the DialogEngine class)
				const aiResponseText = await this.useDialogEngine(sessionId);

				// 4. Handle the "No More Steps / Session Ended" scenario correctly
				if (aiResponseText === undefined) {
					// This means the flow is complete, NOT an internal error.
					ws.send(JSON.stringify({
						type: "msg",
						code: 501, // Using your 501 code for "session ended"
						text: "Conversation complete. No further steps.",
						timestamp: new Date().toISOString()
					}));
					return; // Stop execution, don't save undefined to DB
				}

				// 5. Happy Path: Save AI response and send to client
				this.dbClient.save_msg(sessionId, aiResponseText, 0);

				ws.send(JSON.stringify({
					type: "msg",
					code: 200,
					text: aiResponseText,
					timestamp: new Date().toISOString()
				}));

			} catch (error) {
				// 6. Global catch for THIS specific job. 
				// If the DB, LLM, or Engine fails, it only breaks THIS user's flow, not the whole server.
				console.error(`[Session ${sessionId}] Internal Error:`, error);

				ws.send(JSON.stringify({
					type: "msg",
					code: 500,
					text: 'There was an internal error processing your request.',
					timestamp: new Date().toISOString()
				}));
			}

			//// ===================
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
	//
	// the problem is here when it comes to merging sessions state
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
