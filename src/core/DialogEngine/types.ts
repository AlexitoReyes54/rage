
import type { StepRegistryRecord } from "../BussinesLogicTransformer/types";
import type { StepTypeNames } from "../BussinesLogicParser/types";
import StateMachine from "../StateMachine/StateMachine";

export interface CollectedDataBase {
	type: StepTypeNames;
}

export interface CollectParam extends CollectedDataBase {
	collectedData: string | boolean | number;
}

export interface DialogEngineState {
	stateMachine?: StateMachine;
	stepsDetailedInfo?: StepRegistryRecord;
	instructionsForLlm?: string; // this should be a object
	timesOnThisStep?: number;
	collectedData?: string | boolean | number;
}

