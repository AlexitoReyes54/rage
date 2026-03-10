import BussinesLogicParser from "../BussinesLogicParser/BussinesLogicParser";
import type { Transition } from "../StateMachine/types";
import { type Workflow, type StepType } from "../BussinesLogicParser/types";
import type { StepRegistryRecord, StatesStructure, NodeStuctureForStateMachine, StepPropertyTypes } from "./types";
import AppError from "../Errors/AppError";
import StateMachine from "../StateMachine/StateMachine";
import type { SlotsObject } from "../StateMachine/types";

import visualizeWorkflow from "../StateMachine/utils/visualizeWorkflow";

type conditionalSections = "then" | "else";

function isThisAPointer(stateName: string) {
	if (stateName.includes("END")) {
		return false;
	}

	if (stateName.includes("LINK")) {
		return true;
	}

	return false;
}

function isTheEnd(stepName: string) {
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
	try {
		const emptyEvent = () => null;
		let transitions: Transition[] = [];
		const nodes = Object.keys(flowStructure);
		const linkStep = (currentStepsSet: string[], firstStepFromNextSet: string, nextNode: NodeStuctureForStateMachine) => {
			currentStepsSet.forEach((step, i) => {
				const nextStep = currentStepsSet[i + 1] || firstStepFromNextSet;
				const destinations: string[] | undefined = [];

				if (isThisAPointer(step)) {
					// if there is an error with the links pointers 
					// take a look here
					getAllLinkStepDestinations(nextNode)
						.forEach(item => destinations.push(item))
				} else {
					destinations.push(nextStep);
				}

				if (!destinations) {
					throw new AppError("error parsing links inside conditional while building state machie")
				}

				destinations.forEach(destination => {
					transitions.push({
						name: generateTransitionName(step, destination),
						from: step,
						to: destination,
						event: emptyEvent
					})
				})
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

		return transitions;

	} catch (error) {
		console.log(error);
		throw new AppError('error creating transitions for file ')
	}
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

function generateStepName(
	id: string,
	step: StepType,
	conditional?: conditionalSections) {

	let condition_inter = conditional === "then" ?
		'_if_then_' :
		'_if_else_';

	let inter = conditional ?
		condition_inter :
		"_";

	return `${id}${inter}${formatStepName(step)}`
}


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
	private static storage: Record<string, StepRegistryRecord> = {};

	/// refactor here the way the steps are stored 
	static saveSingleStep(fileName: string, stepName: string, data: StepPropertyTypes) {
		if (!this.storage[fileName]) {
			this.storage[fileName] = {
				nodes: {},
				steps: {}
			};
		}

		this.storage[fileName].steps[stepName] = data;
	}

	// TODO implement this to add the information in the node structure 
	// and remmnber to add the condition to the node 
	static saveStepToNode(fileName: string,
		nodeName: string,
		stepName: string,
		conditionalBlock?: conditionalSections) {

		if (!this.storage[fileName]) {
			this.storage[fileName] = {
				nodes: {},
				steps: {}
			};
		}

		if (!conditionalBlock) {
			this.storage[fileName]?.nodes[nodeName]?.steps.push(stepName)
			return;
		}

		const keyMap = {
			then: 'ifTrue',
			else: 'ifFalse'
		} as const;
		const block: 'ifTrue' | 'ifFalse' = keyMap[conditionalBlock];

		this.storage[fileName]?.nodes[nodeName]?.evaluation[block].push(stepName)
	}

	static getAllStepsFromDoc(fileName: string) {
		return this.storage[fileName];
	}

	static getStorage() {
		return this.storage
	}
}

class BussinesLogicTransformer {
	private static workflowMemoryStorage: Map<string, Workflow> = new Map();
	private static stateMachineMemoryStorage: Map<string, StateMachine> = new Map();

	static getWorkflowsMapStore() {
		return this.workflowMemoryStorage;
	}

	static getStateMachinesMapStore() {
		return this.stateMachineMemoryStorage;
	}

	static getAllWorkflowsStepsInfo() {
		return StepRegistry.getStorage();
	}


	static loadYamlIntoMemory(yamlFileName: string, yamlFileContent: string) {
		if (this.workflowMemoryStorage.has(yamlFileName)) {
			throw new AppError('there are 2 files with the same file name');
		}
		const bussinesLogicParser = new BussinesLogicParser();
		const workflowFile = bussinesLogicParser.parserYamlIntoProcessFile(yamlFileContent);
		const workflowSlots = bussinesLogicParser.getSlotsObject();
		this.workflowMemoryStorage.set(yamlFileName, workflowFile);
		this.transformIntoNodeInfoMap(workflowFile, yamlFileName);
		this.transformIntoStateMachine(workflowFile, yamlFileName, workflowSlots)
	}

	static transformIntoNodeInfoMap(workflow: Workflow, fileName: string) {

		workflow.process.forEach(node => {
			if (node.if) {
				node.if.then.forEach(step => {
					let stepName = generateStepName(node.id, step, 'then')
					let value = getStepTypeProperties(step, node.id, node.description)
					StepRegistry.saveSingleStep(fileName, stepName, value)
					StepRegistry.saveStepToNode(fileName, node.id, stepName, 'then')
				})

				node.if.else.forEach(step => {
					let stepName = generateStepName(node.id, step, 'else')
					let value = getStepTypeProperties(step, node.id, node.description)
					StepRegistry.saveSingleStep(fileName, stepName, value)
					StepRegistry.saveStepToNode(fileName, node.id, stepName, 'else')
				})
			}

			node.steps.forEach(step => {
				let stepName = generateStepName(node.id, step)
				let value = getStepTypeProperties(step, node.id, node.description)
				StepRegistry.saveSingleStep(fileName, stepName, value)
				StepRegistry.saveStepToNode(fileName, node.id, stepName)
			})

		})

	}

	static transformIntoStateMachine(workflowFile: Workflow, fileName: string, workflowSlots: SlotsObject) {
		try {
			let workflowStepsRepresentation: StatesStructure = {};
			let states: string[] = [];
			workflowFile.process.forEach(item => {

				workflowStepsRepresentation[item.id] = {
					conditional: {
						then: [],
						else: []
					},
					steps: []
				}

				item.if?.then.forEach(step => {
					let stepName = generateStepName(item.id, step, 'then')
					states.push(stepName);
					workflowStepsRepresentation[item.id]?.conditional.then.push(stepName);

				})

				item.if?.else.forEach(step => {
					let stepName = generateStepName(item.id, step)
					states.push(stepName);
					workflowStepsRepresentation[item.id]?.conditional.else.push(stepName);
				})

				item.steps.forEach(step => {
					let stepName = generateStepName(item.id, step)
					states.push(stepName);
					workflowStepsRepresentation[item.id]?.steps.push(stepName);
				})

			})

			let transitions = getFlowTransitions(workflowStepsRepresentation)
			let firstState = states[0];

			let machine = new StateMachine(firstState, states, transitions, workflowSlots)

			this.stateMachineMemoryStorage.set(fileName, machine)
		} catch (error) {
			console.log(error);

			throw new AppError('error creating state machie for one of the workflows ' + fileName);
		}
	}
}

export default BussinesLogicTransformer;
