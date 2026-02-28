// steps
// - using that pass it into the state machiene class so it returns the thing i need 
//   for the engine

// i need to initiace and return a working state machine for the engine

import BussinesLogicParser from "../BussinesLogicParser/BussinesLogicParser";
import type { Transition } from "../StateMachine/types";
import { type Workflow, type StepType, SlotTypes, type LinkStepType } from "../BussinesLogicParser/types";
import AppError from "../Errors/AppError";

interface NodeStuctureForStateMachine {
	conditional: {
		then: string[];
		else: string[];
	};
	steps: string[];
}

type StatesStructure = Record<string, NodeStuctureForStateMachine>



function isThisAPointer(stateName: string) {
	if (stateName.includes("LINK")) {
		return true;
	}
	return false;
}

const getStepItLinks = (linkStep: string) => linkStep.split('_LINK_')[1];

function getFlowTransitions(flowStructure: StatesStructure): Transition[] {
	let transitions: any[] = [];
	const nodes = Object.keys(flowStructure);
	const linkStep = (currentStepsSet: string[], firstStepFromNextSet: string) => {
		currentStepsSet.forEach((step, i) => {
			const nextStep = currentStepsSet[i + 1] || firstStepFromNextSet;
			const destination: string | undefined = isThisAPointer(step) ?
				getStepItLinks(step) :
				nextStep;

			if (!destination) {
				throw new AppError("error trying to build state mahine transitions")
			}

			transitions.push({
				from: step,
				to: destination
			})
		})
	}


	nodes.forEach((node, nodeIndex) => {
		let nodeInfo = flowStructure[node];

		if (!nodeInfo) {
			throw new AppError("error happend while trying to build state machine from bussine logic file");
		}

		let { conditional, steps } = nodeInfo;

		if (!steps[0]) {
			throw new AppError("something went wrong with the steps parsing from the bussines logic file");
		}
		// { name: 'melt', from: 'solid', to: 'liquid', event: mockEvent },
		if (conditional.then) {
			linkStep(conditional.then, steps[0])
		}

		if (conditional.else) {
			linkStep(conditional.else, steps[0])
		}

		// only if there is next item is undefined dont add transitions
		let nextNode = nodes[nodeIndex + 1];
		if (!nextNode) {
			throw new AppError("something went wrong with the steps parsing from the bussines logic file");
		}

		// cuando voy a siguiente nodo puedo ir al then o al else
		// si hay condicionales entonces voy a los conditionals
		// si no hay condicionales voy a los steps 

		// this logic that goes here should be inside the link functino in the linkstep function
		let thenSteps = flowStructure[nextNode]?.conditional.then;
		let elseSteps = flowStructure[nextNode]?.conditional.else;


		/// TODO implement the logic to point to the next node when building the transition 
		// list for the state machine 
		// by the way i think next node are not neccesarry anymore 

		if (thenSteps) {
			transitions.push({
				from: "",
				to: ""
			})
		}

		//linkStep(steps, x)
	})

	console.log("transitions", transitions);
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
	nodes: Record<string, StepPropertyTypes[]>
}

let l: LinkStepProperties = {
	link: 'some',
	type: "LINK",
	nodeId: "",
	nodeDescription: ""
}

let t: Record<string, StepRegistryRecord> = {
	"flow": {
		nodes: {
			"greet": [],
			ask: [l, l, l, l],
			out: []
		}
	}
}

// the data here has to be structured better
class StepRegistry {
	private static storage: Record<string, StepRegistryRecord> = {};

	static save(fileName: string, nodeName: string, data: StepPropertyTypes) {
		if (!this.storage[fileName]) {
			this.storage[fileName] = { nodes: {} };
		}
		if (!this.storage[fileName].nodes[nodeName]) {
			this.storage[fileName].nodes[nodeName] = [];
		}
		this.storage[fileName].nodes[nodeName].push(data)
	}

	static getAllStepsFromDoc(fileName: string) {
		return this.storage[fileName];
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
		//this.transformIntoNodeInfoMap(workflowFile, yamlFileName);
		this.transformIntoStateMachine(workflowFile, yamlFileName)
	}

	static transformIntoNodeInfoMap(workflow: Workflow, fileName: string) {

		workflow.process.forEach(node => {
			if (node.if) {
				node.if.then.forEach(step => {
					//let stepName = `${node.id}_if_then_${formatStepName(step)}`
					let value = getStepTypeProperties(step, node.id, node.description)
					// the problem is here the way data is structured is bad so the problem is hard to solve
					StepRegistry.save(fileName, node.id, value)
				})

				node.if.else.forEach(step => {
					//let stepName = `${node.id}_if_else_${formatStepName(step)}`
					let value = getStepTypeProperties(step, node.id, node.description)
					StepRegistry.save(fileName, node.id, value)
				})
			}

			node.steps.forEach(step => {
				//let stepName = `${node.id}_${formatStepName(step)}`
				let value = getStepTypeProperties(step, node.id, node.description)
				StepRegistry.save(fileName, node.id, value)
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


		// 2. get all the transitions
		// 3. get all the slots 
		let buffer: StatesStructure = {};
		workflowFile.process.forEach(item => {

			buffer[item.id] = {
				conditional: {
					then: [],
					else: []
				},
				steps: []
			}

			item.if?.then.forEach(step => {
				let stepName = `${item.id}_if_then_${formatStepName(step)}`
				buffer[item.id]?.conditional.then.push(stepName);

			})

			item.if?.else.forEach(step => {
				let stepName = `${item.id}_if_else_${formatStepName(step)}`
				buffer[item.id]?.conditional.else.push(stepName);
			})

			item.steps.forEach(step => {
				let stepName = `${item.id}_${formatStepName(step)}`
				buffer[item.id]?.steps.push(stepName);
			})

		})
		console.log(buffer);


		console.log('--------------------------');

		try {
			getFlowTransitions(buffer)
		} catch (error) {
			throw new AppError("error setting the transitions")
		}

		// from & to 	
		// { name: 'melt', from: 'solid', to: 'liquid', event: mockEvent },

		//	let docSteps = StepRegistry.getAllStepsFromDoc(yamlFileName)
		//console.log(doc);
		//console.log(docSteps);


		//const flowStates = Object.keys(docSteps?.steps)
		//const transitions = getFlowTransitions(docSteps);
		//console.log(docSteps);

	}

}

export default BussinesLogicTransformer;
