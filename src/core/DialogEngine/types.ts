
import type { StepRegistryRecord } from "../BussinesLogicTransformer/types";
import type { SlotTypes, StepTypeNames } from "../BussinesLogicParser/types";
import StateMachine from "../StateMachine/StateMachine";
import { type ResponseInput } from "../LlmProviderManager/LlmProviderManager";

export interface CollectedDataBase {
	type: StepTypeNames;
}

export interface CollectParam extends CollectedDataBase {
	collectedData: string | boolean | number;
}

export interface DialogEngineState {
	stateMachine?: StateMachine;// to expose the state machine like this is dangerous
	stepsDetailedInfo?: StepRegistryRecord;
	instructionsForLlm?: {
		textInstructions?: string;
		slotType?: SlotTypes;
	}; 
	timesOnThisStep?: number;
	collectedData?: string | boolean | number;
	chatHistory?: ResponseInput[];
	isFlowComplete?:boolean;
}

