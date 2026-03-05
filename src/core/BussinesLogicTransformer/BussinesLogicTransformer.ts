// TODO
// what i have to do now is to somehow provider information about each state, 
// right now the state machino works so it know where is at but it does not know 
// what that state meanst that is the StepRegistry responsability for that i have to 
// make sure that the StepRegistry is using the proper name convetions for storing the steps infomatino 
// so that just with the name of the step i ca access the detail of that step 
//

import BussinesLogicParser from "../BussinesLogicParser/BussinesLogicParser";
import type { Transition } from "../StateMachine/types";
import { type Workflow, type StepType, SlotTypes, type LinkStepType } from "../BussinesLogicParser/types";
import AppError from "../Errors/AppError";
import StateMachine from "../StateMachine/StateMachine";
import visualizeWorkflow from "../StateMachine/utils/visualizeWorkflow";

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
	console.log(destinations);
	console.log('------------------------------------------------------');

	return destinations;
}

/// this required me to make some refactor this is not workin
const getStepItLinks = (linkStep: string) => linkStep.split('_LINK_')[1];

const generateTransitionName = (from: string, to: string) => `from_${from}_to_${to}`;

// TODO the bug is here for some reasont the links are not working properly when creating the links 
// references so we need to make sure this is happening as it should 
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

			destinations.forEach(destination => {

				//console.log(`${step} => ${generateTransitionName(step, destination)} => ${destination}`);
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

function generateStepName(
	id: string,
	step: StepType,
	conditional?: "then" | "else") {

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

interface StepRegistryRecord {
	steps: Record<string, StepPropertyTypes>
}

let l: LinkStepProperties = {
	link: 'some',
	type: "LINK",
	nodeId: "",
	nodeDescription: ""
}

// the data here has to be structured better
class StepRegistry {
	private static storage: Record<string, StepRegistryRecord> = {};

	/// refactor here the way the steps are stored 
	static save(fileName: string, stepName: string, data: StepPropertyTypes) {
		if (!this.storage[fileName]) {
			this.storage[fileName] = { steps: {} };
		}

		this.storage[fileName].steps[stepName] = data;
	}
	/// here is the problem

	static getAllStepsFromDoc(fileName: string) {
		return this.storage[fileName];
	}

	static getStorage() {
		return this.storage
	}
}

class BussinesLogicTransformer {
	private static bussinesLogicMemoryStorage: Map<string, Workflow> = new Map();


	static getBussinesLogicMapStore() {
		return this.bussinesLogicMemoryStorage;
	}

	static getAllWorkflowsStepsInfo() {
		return StepRegistry.getStorage();
	}


	static loadYamlIntoMemory(yamlFileName: string, yamlFileContent: string) {
		if (this.bussinesLogicMemoryStorage.has(yamlFileName)) {
			throw new AppError('there are 2 files with the same file name');
		}
		let workflowFile = new BussinesLogicParser().parserYamlIntoProcessFile(yamlFileContent);
		this.bussinesLogicMemoryStorage.set(yamlFileName, workflowFile);
		this.transformIntoNodeInfoMap(workflowFile, yamlFileName);
		this.transformIntoStateMachine(workflowFile)
	}

	static transformIntoNodeInfoMap(workflow: Workflow, fileName: string) {

		workflow.process.forEach(node => {
			if (node.if) {
				node.if.then.forEach(step => {
					//let stepName = `${node.id}_if_then_${formatStepName(step)}`
					let stepName = generateStepName(node.id, step, 'then')
					let value = getStepTypeProperties(step, node.id, node.description)
					// the problem is here the way data is structured is bad so the problem is hard to solve
					StepRegistry.save(fileName, stepName, value)
				})

				node.if.else.forEach(step => {
					//let stepName = `${node.id}_if_else_${formatStepName(step)}`
					let stepName = generateStepName(node.id, step, 'else')
					let value = getStepTypeProperties(step, node.id, node.description)
					StepRegistry.save(fileName, stepName, value)
				})
			}

			node.steps.forEach(step => {
				//let stepName = `${node.id}_${formatStepName(step)}`
				let stepName = generateStepName(node.id, step)
				let value = getStepTypeProperties(step, node.id, node.description)
				StepRegistry.save(fileName, stepName, value)
			})

		})

	}

	static transformIntoStateMachine(workflowFile: Workflow) {
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
					workflowStepsRepresentation[item.id]?.conditional.else.push(stepName, 'else');
				})

				item.steps.forEach(step => {
					let stepName = generateStepName(item.id, step)
					states.push(stepName);
					workflowStepsRepresentation[item.id]?.steps.push(stepName);
				})

			})

			let transitions = getFlowTransitions(workflowStepsRepresentation)
			let firstState = states[0];

			//console.log(transitions);
			//:wlet machine = new StateMachine(firstState, states, transitions)

			// TODO change the first param in the future this is just for testing 
			//let mapa = machine.getStatesGrahp();
			//visualizeWorkflow(mapa)
			//return machine;

		} catch (error) {
			throw new AppError('error creating state machie for one of the workflows');
		}
	}
}

export default BussinesLogicTransformer;
