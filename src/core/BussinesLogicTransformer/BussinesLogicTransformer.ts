// steps
// - using that pass it into the state machiene class so it returns the thing i need 
//   for the engine

// i need to initiace and return a working state machine for the engine

import BussinesLogicParser from "../BussinesLogicParser/BussinesLogicParser";
import { type Workflow, type StepType, SlotTypes } from "../BussinesLogicParser/types";
import AppError from "../Errors/AppError";

function formatStepName(step: StepType) {
	switch (step.type) {
		case "LINK":
			return `${step.type}_${step.link}`
		case "NEXT":
			return `${step.type}_${step.next}`
		case "ACTION":
			return `${step.type}_${step.action}`
		case "COLLECT":
			return `${step.type}_${step.collect.name}`
		default:
			throw new AppError('no valid step type')
	}
}

interface BaseStepProperties {
	nodeId: string;
	nodeDescription: string | undefined;
}

interface LinkStepProperties extends BaseStepProperties {
	type: "LINK";
	link: string;
}

interface NextStepProperties extends BaseStepProperties {
	type: "NEXT";
	next: string;
}

interface ActionStepProperties extends BaseStepProperties {
	type: "ACTION";
	actionName: string;
	actionParams: string[] | undefined;
}

interface CollectStepProperties extends BaseStepProperties {
	type: "COLLECT";
	slotName: string;
	slotType: string;
	note: string | undefined;
}

type StepPropertyTypes = LinkStepProperties | NextStepProperties | ActionStepProperties | CollectStepProperties;

function getStepTypeProperties(step: StepType, nodeId: string, nodeDescription: string = ''): StepPropertyTypes {
	let base = { nodeId, nodeDescription }
	switch (step.type) {
		case "LINK":
			return { ...base, type: step.type, link: step.link }
		case "NEXT":
			return { ...base, type: step.type, next: step.next }
		case "ACTION":
			return { ...base, type: step.type, actionName: step.action, actionParams: step.params }
		case "COLLECT":
			return { ...base, type: step.type, slotName: step.collect.name, slotType: step.collect.type, note: step.collect.note }
		default:
			throw new AppError('no valid step type')
	}
}

class StepRegistry {
	// Key format: "filename|stepName"
	private static storage = new Map<string, StepPropertyTypes>();

	static save(fileName: string, stepName: string, data: StepPropertyTypes) {
		this.storage.set(`${fileName}|${stepName}`, data);
	}

	static get(fileName: string, stepName: string): StepPropertyTypes | undefined {
		return this.storage.get(`${fileName}|${stepName}`);
	}

	static getStorage() {
		return this.storage;
	}
}

class BussinesLogicTransformer {
	private static bussinesLogicMemoryStorage: Map<string, Workflow> = new Map();

	static getLogicStorate() {
		return this.bussinesLogicMemoryStorage;
	}

	static getReferenceNodeInfo() {
		return StepRegistry.getStorage();
	}


	static loadYamlIntoMemory(yamlFileName: string, yamlFileContent: string) {
		if (this.bussinesLogicMemoryStorage.has(yamlFileName)) {
			throw new AppError('there are 2 files with the same file name');
		}
		let workflowFile = new BussinesLogicParser().parserYamlIntoProcessFile(yamlFileContent);
		this.bussinesLogicMemoryStorage.set(yamlFileName, workflowFile);
		this.transformIntoNodeInfoMap(workflowFile, yamlFileName);
	}

	static transformIntoNodeInfoMap(workflow: Workflow, fileName: string) {
		workflow.process.forEach(node => {
			node.steps.forEach(step => {
				let stepName = `${node.id}_${formatStepName(step)}`
				let value = getStepTypeProperties(step, node.id, node.description)
				StepRegistry.save(fileName, stepName, value)
			})

			if (!node.if) { return; }

			node.if.then.forEach(step => {
				let stepName = `${node.id}_if_then_${formatStepName(step)}`
				let value = getStepTypeProperties(step, node.id, node.description)
				StepRegistry.save(fileName, stepName, value)
			})

			node.if.else.forEach(step => {
				let stepName = `${node.id}_if_else_${formatStepName(step)}`
				let value = getStepTypeProperties(step, node.id, node.description)
				StepRegistry.save(fileName, stepName, value)
			})
		})
	}

	static transformIntoStateMachine() {
		// TODO implement create of state machine based on flow files
	}
}

export default BussinesLogicTransformer;
