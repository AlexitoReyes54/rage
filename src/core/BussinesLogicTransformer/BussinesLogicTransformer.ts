// steps
// - using that pass it into the state machiene class so it returns the thing i need 
//   for the engine
//

// i need to initiace and return a working state machine for the engine

import BussinesLogicParser from "../BussinesLogicParser/BussinesLogicParser";
import type { Transition } from "../StateMachine/types";
import { type Workflow, type StepType, SlotTypes, type LinkStepType } from "../BussinesLogicParser/types";
import AppError from "../Errors/AppError";
import StateMachine from "../StateMachine/StateMachine";
import visualizeWorkflow from "../StateMachine/utils/visualizeWorkflow";
import { which } from "bun";

interface NodeStuctureForStateMachine {
	conditional: {
		then: string[];
		else: string[];
	};
	steps: string[];
}

type StatesStructure = Record<string, NodeStuctureForStateMachine>


function isThisAPointer(stateName: string) {
	if (stateName.includes("END")) {
		return false;
	}

	if (stateName.includes("LINK")) {
		return true;
	}

	return false;
}
function isTheEnd(stepName: type) {
	if (stepName.includes("END")) {
		return true;
	}
	return false;
}

function getAllLinkStepDestinations(nextNode: NodeStuctureForStateMachine): string[] {
	let destinations: string[] = [];

	let thenSteps = nextNode.conditional.then;
	let elseSteps = nextNode.conditional.else;
	let commonSteps = nextNode.steps;

	if (thenSteps.length > 0 && thenSteps[0]) {
		destinations.push(thenSteps[0])
	}

	if (elseSteps.length > 0 && elseSteps[0]) {
		destinations.push(elseSteps[0])
	}

	if (commonSteps.length > 0 && commonSteps[0]) {
		destinations.push(commonSteps[0])
	}

	return destinations;
}

/// this required me to make some refactor this is not workin
const getStepItLinks = (linkStep: string) => linkStep.split('_LINK_')[1];

const generateTransitionName = (from: string, to: string) => `from_${from}_to_${to}`;

function getFlowTransitions(flowStructure: StatesStructure): Transition[] {
	const emptyEvent = () => null;
	let transitions: Transition[] = [];
	const nodes = Object.keys(flowStructure);
	const linkStep = (currentStepsSet: string[], firstStepFromNextSet: string, nextNode: NodeStuctureForStateMachine) => {
		currentStepsSet.forEach((step, i) => {
			const nextStep = currentStepsSet[i + 1] || firstStepFromNextSet;
			const destinations: string[] | undefined = [];

			if (isThisAPointer(step)) {
				getAllLinkStepDestinations(nextNode)
			} else {
				destinations.push(nextStep);
			}

			if (!destinations) {
				throw new AppError("error parsing links inside conditional while building state machie")
			}

			destinations.forEach(destination => transitions.push({
				name: generateTransitionName(step, destination),
				from: step,
				to: destination,
				event: emptyEvent
			}));

		})
	}


	nodes.forEach((node, nodeIndex) => {
		let nodeInfo = flowStructure[node];

		if (!nodeInfo) {
			throw new AppError("error happend while trying to build state machine from bussine logic file");
		}

		let nextNode = nodes[nodeIndex + 1];

		if (!nextNode && nodes.length - 1 !== nodeIndex) {
			throw new AppError("there is an error pointing to the next node and state machine building");
		}

		let { conditional, steps } = nodeInfo;

		if (!steps[0]) {
			throw new AppError("something went wrong with the steps parsing from the bussines logic file steps");
		}

		if (conditional.then && nextNode) {
			linkStep(conditional.then, steps[0], flowStructure[nextNode] as NodeStuctureForStateMachine)
		}

		if (conditional.else && nextNode) {
			linkStep(conditional.else, steps[0], flowStructure[nextNode] as NodeStuctureForStateMachine)
		}

		for (let i = 0; i < steps.length; i++) {
			const currentStep = steps[i];
			const nextStep = steps[i + 1];

			if (!currentStep || (!nextStep && steps.length - 1 !== i)) {
				throw new AppError('error happended while reading steps and turning them into state machine transitions')
			}

			if (isThisAPointer(currentStep) && nextNode) {
				const destinations = getAllLinkStepDestinations(flowStructure[nextNode] as NodeStuctureForStateMachine);
				destinations.forEach(destination => transitions.push({
					from: currentStep,
					to: destination,
					name: generateTransitionName(currentStep, destination),
					event: emptyEvent
				}));
			} else {

				if (isTheEnd(currentStep)) {
					return;
				}

				transitions.push({
					from: currentStep,
					to: nextStep,
					name: generateTransitionName(currentStep, nextStep),
					event: emptyEvent
				})
			}
		}

	})

	//console.log("transitions", transitions);
	return transitions;
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

		/*
		let slots = {
			name: "Juan",
			age: 19,
			canDrink: true,
		}
		* */


		// 3. get all the slots 
		let buffer: StatesStructure = {};
		let states: string[] = [];
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
				states.push(stepName);
				buffer[item.id]?.conditional.then.push(stepName);

			})

			item.if?.else.forEach(step => {
				let stepName = `${item.id}_if_else_${formatStepName(step)}`
				states.push(stepName);
				buffer[item.id]?.conditional.else.push(stepName);
			})

			item.steps.forEach(step => {
				let stepName = `${item.id}_${formatStepName(step)}`
				states.push(stepName);
				buffer[item.id]?.steps.push(stepName);
			})

		})

		console.log('--------------------------');
		// TODO re-think this section over here
		try {
			getFlowTransitions(buffer)
		} catch (error) {
			console.log(error);
			throw new AppError("error setting the transitions")
		}

		let transitions = getFlowTransitions(buffer)

		// TODO change the first param in the future this is just for testing 
		let machine = new StateMachine(states[0] || "", states, transitions)
		let mapa = machine.getStatesGrahp();
		visualizeWorkflow(mapa)

	}

}

export default BussinesLogicTransformer;
