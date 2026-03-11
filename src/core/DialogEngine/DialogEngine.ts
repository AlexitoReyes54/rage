import StateMachine from "../StateMachine/StateMachine";
import BussinesLogicTransformer from "../BussinesLogicTransformer/BussinesLogicTransformer";
import AppError from "../Errors/AppError";
import type { StepPropertyTypes, StepRegistryRecord } from "../BussinesLogicTransformer/types";
import type { StepTypeNames } from "../BussinesLogicParser/types";

interface CollectedDataBase {
	type: StepTypeNames;
}

export interface CollectParam extends CollectedDataBase {
	collectedData: string | boolean | number;
}

interface DialogEngineState {
	stateMachine: StateMachine;
	stepsDetailedInfo: StepRegistryRecord;
	instructionsForLlm: string; // this should be a object
	currentStepType: StepTypeNames;
	timesOnThisStep: number;
}



// TODO implement this fn this should be a util pritity +1 
const nodeConditionIsTrue = (): boolean => true;


/*
 * consider inplmenting a validation like this on for the booleans
*
*  function castToType(input: any, targetType: 'string' | 'number' | 'boolean') {
  if (targetType === 'number') return Number(input);
  if (targetType === 'boolean') return String(input).toLowerCase() === 'true';
  return String(input);
}
*
* for the next function

* */

function validateDataType(collectedData: any, expectedDataType: 'number' | 'string' | 'boolean') {
	let typeOfCollectedData = typeof collectedData;
	return typeOfCollectedData === expectedDataType ? true : false;
}

class DialogEngine {
	private stateMachine: StateMachine;
	private stepsDetailedInfo: StepRegistryRecord;
	private workflowName: string;

	constructor(workflowName: string, stateMachine?: StateMachine) {
		const workflowStateMachine = stateMachine ?? BussinesLogicTransformer
			.getStateMachinesMapStore()
			.get(workflowName)
		const stepsDetailedInfo = BussinesLogicTransformer.getAllWorkflowsStepsInfo()[workflowName]

		if (!workflowStateMachine || !stepsDetailedInfo) {
			throw new AppError('error the state machine your are looking for does not exist while using dialog engine for ' + workflowName);
		}

		this.workflowName = workflowName;
		this.stepsDetailedInfo = stepsDetailedInfo;
		this.stateMachine = workflowStateMachine;
	}

	intialize() {

	}

	makeTransition(currentStepDetails: StepPropertyTypes) {
		let possibleTransitionList = this.stateMachine.getPossibleTransitions();

		if (possibleTransitionList.length === 1 && possibleTransitionList[0]) {

			const transitionName = possibleTransitionList[0]?.name;

			this.stateMachine.transition(transitionName);
		} else if (possibleTransitionList.length === 3) {
			const branch = nodeConditionIsTrue() ? 'ifTrue' : 'ifFalse';
			const currStepName = possibleTransitionList[0]?.from;

			if (!currentStepDetails.nodeConditional) {
				throw new AppError('there is a link that points to 3 steps but the node it points to has no conditional for file' + this.workflowName)
			}

			const targetStepName = this.stepsDetailedInfo.nodes[currentStepDetails.nodeId]?.evaluation[branch][0];
			const transition = possibleTransitionList.find(t => t.to === targetStepName);

			if (!transition) {
				throw new AppError('there is nos transiton in the step ' + currStepName + 'to ' + targetStepName)
			}

			this.stateMachine.transition(transition.name)
		} else {
			throw new AppError('error in the DialogEngine, unknow scenaro where link has not 1 or 3 refeences, see the doc information this was not considering while coding this feature for file' + this.workflowName)
		}
	}

	// error that happends inside this functino has to be habdled with grace 
	// be super carefull with them
	excuteCurrentStep(collectedData: CollectParam): DialogEngineState {

		// this has to be a prop as well as a return values 
		// i have to create a new one instead of copyng what comes from the 
		// props of the function
		let dialogEngineState: DialogEngineState = {
			stateMachine: this.stateMachine,
			stepsDetailedInfo: this.stepsDetailedInfo,
			instructionsForLlm: '',
			currentStepType: 'UNDEFINED',
			timesOnThisStep: 0
		}

		// how to execute steps:
		// - see the step requirements 
		// - the details are just for the llm not the engine logic 
		// - it has to tell what to send to the llm

		let curr = this.stateMachine.getCurrentState();
		let currentStepDetails = this.stepsDetailedInfo.steps[curr];

		console.log('---------------------');
		console.log(currentStepDetails);
		console.log('---------------------');

		switch (currentStepDetails?.type) {
			case 'COLLECT':
				dialogEngineState.currentStepType = currentStepDetails.type;
				const userInput = collectedData.collectedData;

				if (!userInput) {
					// do the same step again - collect the slot
				}

				if (!validateDataType(userInput, currentStepDetails.slotType)) {
					throw new AppError('error collecting user inputs it seems like the llm is not returning the same type as the one defined in the bussine logic file ')
				}

				// here its a yes in principle 
				this.stateMachine.updateSingleSlot(currentStepDetails.slotName, userInput)

				// move to the next step
				this.makeTransition(currentStepDetails)
				// once this is updated i need to make sure that i send the instruccions to the state machine

				// see if collected in the promt 
				// if not then tell the rephraser to get it 
				// if yes update the state machine then pass to the next step

				break;
			case 'ACTION':
				// intereac ti actions manager
				break;
			case 'LINK':
				// link moves then executes logic i guess
				break;
			case 'NEXT':
				// dont implement it next step type is not going to 
				// be used anymore 
				break

		}
		return dialogEngineState;
	}

	getCurrentStepInfo() {

	}

	executeAction() {


	}

	updateSlot() {

	}
}

export default DialogEngine;
