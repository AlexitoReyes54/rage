// steps
// - using that pass it into the state machiene class so it returns the thing i need 
//   for the engine

// i need to initiace and return a working state machine for the engine

import BussinesLogicParser from "../BussinesLogicParser/BussinesLogicParser";
import type { Transition } from "../StateMachine/types";
import { type Workflow, type StepType, SlotTypes } from "../BussinesLogicParser/types";
import AppError from "../Errors/AppError";

/*
let transitions: Transition[] = [
		{ name: 'melt', from: 'solid', to: 'liquid', event: mockEvent },
		{ name: 'freeze', from: 'liquid', to: 'solid', event: mockEvent },
		{ name: 'vaporize', from: 'liquid', to: 'gas', event: mockEvent },
		{ name: 'condense', from: 'gas', to: 'liquid', event: mockEvent }
	]
	*/


// what i have to do now ????
// well, well, well... 
// i need to determine how im going to build the transitions 
// i have some basic rules for that but that is not enough
// lets map the issue and then work with that 
//
// 1. what info i have now 
// 2. how i want to map this out 
function getFlowTransitions(docSteps: StepRegistryRecord): Transition[] {
	const stepsNames = Object.keys(docSteps.steps) // here the names and references 

	let res = stepsNames.map((currentStepName, index) => { // here i loop that so i see each step
		console.log(currentStepName);
		console.log(docSteps.steps[currentStepName]);

		// this is some kind of logic to know what the next node is 
		const currentStep = docSteps.steps[currentStepName];
		const nextStepName = stepsNames[index + 1];

		if (!nextStepName && index + 1 === stepsNames.length) {
			//exit this is the las item
			return;
		} else if (!nextStepName) {
			throw new AppError('the next step was not found')
		}

		const nextStep = docSteps.steps[nextStepName]

		// TODO implement the transtion array generation for the state machiene
		//
		// here it seems that i have to return the obj that represents where the node can point to 
		switch (docSteps.steps[currentStepName]?.type) {
			case 'LINK':
				return 'link'
			case 'NEXT':
				return 'next'
			case 'ACTION':
				return {
					name: `from_${currentStepName}_to_${nextStepName}`
				}
			case 'COLLECT':
				return {
					name: `from_${currentStepName}_to_${nextStepName}`
				}
			default:
				break;
		}
		console.log('-----------------');
	})

	console.log(res);
	return [];
}

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


interface StepRegistryRecord {
	steps: Record<string, StepPropertyTypes>
}


class StepRegistry {
	private static storage: Record<string, StepRegistryRecord> = {};

	static save(fileName: string, stepName: string, data: StepPropertyTypes) {
		if (!this.storage[fileName]) {
			this.storage[fileName] = { steps: {} };
		}
		this.storage[fileName].steps[stepName] = data;
	}

	static getAllStepsFromDoc(fileName: string) {
		return this.storage[fileName];
	}

	static getSingleStepFromDoc(fileName: string, stepName: string) {
		return this.storage[fileName]?.steps[stepName]
	}

	static getStorage() {
		return this.storage
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
		this.transformIntoStateMachine(workflowFile, yamlFileName)
	}

	static transformIntoNodeInfoMap(workflow: Workflow, fileName: string) {

		workflow.process.forEach(node => {
			if (node.if) {
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
			}

			node.steps.forEach(step => {
				let stepName = `${node.id}_${formatStepName(step)}`
				let value = getStepTypeProperties(step, node.id, node.description)
				StepRegistry.save(fileName, stepName, value)
			})

		})

	}

	static transformIntoStateMachine(workflowFile: Workflow, yamlFileName: string) {
		// TODO implement create of state machine based on flow files
		/*
		let states = ['solid', 'liquid', 'gas']
		let transitions: Transition[] = [
			{ name: 'melt', from: 'solid', to: 'liquid', event: mockEvent },
			{ name: 'freeze', from: 'liquid', to: 'solid', event: mockEvent },
			{ name: 'vaporize', from: 'liquid', to: 'gas', event: mockEvent },
			{ name: 'condense', from: 'gas', to: 'liquid', event: mockEvent }
		]
		let slots = {
			name: "Juan",
			age: 19,
			canDrink: true,
		}
		* */


		// 1. get all the states -- done 
		// 2. get al the transitions
		// 3. get all the slots 


		let docSteps = StepRegistry.getAllStepsFromDoc(yamlFileName)

		if (!docSteps) {
			throw new AppError('Error while getting steps')
		}

		const flowStates = Object.keys(docSteps?.steps)
		const transitions = getFlowTransitions(docSteps);
		//console.log(docSteps);

	}

}

export default BussinesLogicTransformer;
