import type { SlotTypes, Condition, StepTypeNames } from "../BussinesLogicParser/types";

export interface NodeStuctureForStateMachine {
	conditional: {
		then: string[];
		else: string[];
	};
	steps: string[];
}

export type ConditionalSections = "then" | "else";
export type NodeBlocks = ConditionalSections | 'step';

export type StatesStructure = Record<string, NodeStuctureForStateMachine>

export interface BaseStepProperties {
	nodeId: string;
	nodeDescription: string | undefined;
	nodeConditional?: Condition;
	isNodeEntryStep: boolean;
	stepBlock: NodeBlocks;
}

export interface LinkStepProperties extends BaseStepProperties {
	type: "LINK";
	link: string;
}

export interface NextStepProperties extends BaseStepProperties {
	type: "NEXT";
	next: string;
}

export interface ActionStepProperties extends BaseStepProperties {
	type: "ACTION";
	actionName: string;
	actionParams: string[] | undefined;
}

export interface CollectStepProperties extends BaseStepProperties {
	type: "COLLECT";
	slotName: string;
	slotType: SlotTypes;
	note: string | undefined;
}

export type StepPropertyTypes = LinkStepProperties | NextStepProperties | ActionStepProperties | CollectStepProperties;

export interface NodeStructure {
	evaluation: {
		ifTrue: string[];
		ifFalse: string[];
	}
	steps: string[];
}

export interface StepRegistryRecord {
	steps: Record<string, StepPropertyTypes>;
	nodes: Record<string, NodeStructure>;
}

