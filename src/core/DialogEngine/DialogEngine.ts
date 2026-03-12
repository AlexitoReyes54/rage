import StateMachine from "../StateMachine/StateMachine";
import BussinesLogicTransformer from "../BussinesLogicTransformer/BussinesLogicTransformer";
import AppError from "../Errors/AppError";
import type { StepPropertyTypes, StepRegistryRecord, CollectStepProperties, ActionStepProperties } from "../BussinesLogicTransformer/types";
import type { Condition, ConditionCompareValueTypes, Operators, StepTypeNames } from "../BussinesLogicParser/types";
import type { AllowedSlotValues } from "../StateMachine/types";
import ActionsManager from "../ActionsManager/ActionsManager";
import { actionDefinitions } from "../ActionsManager/actionsDefinitions";

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


function ifBooleanBreakTheApp(value: ConditionCompareValueTypes, fileName: string) {
	if (typeof value === 'boolean') {
		throw new AppError('error some boolean is not using a valid operator in this file' + fileName)
	}
}


function executeCompare(
	value: ConditionCompareValueTypes,
	operator: Operators,
	valueToMatch: ConditionCompareValueTypes,
	fileName: string
) {
	const mathOperators: Operators[] = ['>', '<', '>=', '<='];

	if (mathOperators.includes(operator)) {
		ifBooleanBreakTheApp(value, fileName);
	}

	const operations: Record<string, (a: ConditionCompareValueTypes, b: ConditionCompareValueTypes) => boolean> = {
		'>': (a, b) => a > b,
		'<': (a, b) => a < b,
		'>=': (a, b) => a >= b,
		'<=': (a, b) => a <= b,
		'==': (a, b) => a == b,
		'!=': (a, b) => a != b,
	};

	return operations[operator]?.(value, valueToMatch);
}

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

	private isNodeConditionTrue(conditional: Condition): boolean {
		const slotName = conditional.left;

		if (!slotName) {
			throw new AppError('there is a conditional referencing to a non existing slot')
		}

		const slotValue = this.stateMachine.getSlotValue(slotName)

		if (!slotValue) {
			throw new AppError('there is a conditional referencing to a non existing slot')
		}

		let isTrue = executeCompare(
			slotValue,
			conditional.operator,
			conditional.right,
			this.workflowName)

		if (isTrue === undefined) {
			throw new AppError('error during the validation of some conditional in the file' + this.workflowName)
		}

		return isTrue;
	}


	private makeTransition(currentStepDetails: StepPropertyTypes) {
		let possibleTransitionList = this.stateMachine.getPossibleTransitions();

		if (possibleTransitionList.length === 1 && possibleTransitionList[0]) {
			const transitionName = possibleTransitionList[0]?.name;

			this.stateMachine.transition(transitionName);
		} else if (possibleTransitionList.length === 3) {

			const nodeNames = Object.keys(this.stepsDetailedInfo.nodes);
			const currNodeIndex = nodeNames.indexOf(currentStepDetails.nodeId);
			const nextNodeName = nodeNames[currNodeIndex + 1];

			const nextNode = this.stepsDetailedInfo.nodes[nextNodeName as string];
			const firstStepName = nextNode?.steps?.[0];
			const nextStepDetail = this.stepsDetailedInfo.steps[firstStepName as string];

			if (!nextStepDetail?.nodeConditional) {
				throw new AppError(`Invalid link step transition in workflow: ${this.workflowName}`);
			}

			const branch = this.isNodeConditionTrue(nextStepDetail?.nodeConditional) ? 'ifTrue' : 'ifFalse';
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


	private processStepCollect(currentStepDetails: CollectStepProperties, dialogEngineState: DialogEngineState, collectedData: CollectParam) {

		dialogEngineState.currentStepType = currentStepDetails.type;
		const userInput = collectedData.collectedData;

		if (!userInput) {
			return false;
		}

		if (!validateDataType(userInput, currentStepDetails.slotType)) {
			throw new AppError('error collecting user inputs it seems like the llm is not returning the same type as the one defined in the bussine logic file ')
		}

		this.stateMachine.updateSingleSlot(currentStepDetails.slotName, userInput)
		return true;
	}

	// TODO implement some type of retry system if the action fails
	private processStepAction(actionStepDetail: ActionStepProperties, dialogEngineState: DialogEngineState): boolean {

		let actionsParamsObj: Record<string, AllowedSlotValues> = {};

		if (!actionStepDetail.actionParams) {
			throw new AppError('there are not param values defined insede action step ' + actionStepDetail.actionName)
		}

		actionStepDetail.actionParams.forEach(param => {
			let paramValue = this.stateMachine.getSlotValue(param);
			if (!paramValue) {
				throw new AppError('error this prop was not collected during the workflow ' + param + ' file ' + this.workflowName + ' in the action ' + actionStepDetail.actionName)
			}
			actionsParamsObj[param] = paramValue;
		})

		// i have to tell somehow what data type i send and what i expect
		// i think that should be defined inside
		// i have to define that and make it work property no matter what fn im calling
		let x = actionDefinitions.definitions.find(a => a.name === actionStepDetail.actionName)

		// call the fn 
		// depending on the response i want to say all good or all bad

		return true;
	}

	private executeStepWorkflow(dialogEngineState: DialogEngineState, processFn: () => boolean) {
		const isComplete = processFn();

		if (!isComplete) {
			// repeat instructions
			return dialogEngineState;
		}

		this.makeTransition(this.getCurrentStepDetail());

		if (this.getCurrentStepDetail()?.type === 'LINK') {
			this.moveThroughLinkSteps();
		}

		const stepAfterLinks = this.getCurrentStepDetail()
		// Generic "send instructions" logic
		return dialogEngineState;
	}

	private getCurrentStepDetail() {
		let currentStepName = this.stateMachine.getCurrentState();
		let currentStepDetails = this.stepsDetailedInfo.steps[currentStepName];

		if (!currentStepDetails) {
			throw new AppError('the currrent step ' + currentStepName + ' does not exist in workflow ' + this.workflowName)
		}

		return currentStepDetails;
	}

	// error that happends inside this functino has to be habdled with grace 
	// be super carefull with them
	excuteCurrentStep(collectedData: CollectParam): DialogEngineState {

		// this has to be a prop as well as a return values 
		// i have to create a new one instead of copyng what comes from the 
		// props of the function
		// TODO implement this param and make use of it is necessayi if not rething the implementation of this 
		let dialogEngineState: DialogEngineState = {
			stateMachine: this.stateMachine,
			stepsDetailedInfo: this.stepsDetailedInfo,
			instructionsForLlm: '',
			currentStepType: 'UNDEFINED',
			timesOnThisStep: 0
		}

		let currentStepDetails = this.getCurrentStepDetail()

		switch (currentStepDetails?.type) {
			case 'COLLECT':
				this.executeStepWorkflow(
					dialogEngineState,
					() => this.processStepCollect(currentStepDetails, dialogEngineState, collectedData)
				);
			case 'ACTION':
				this.executeStepWorkflow(
					dialogEngineState,
					() => this.processStepAction()
				);
			case 'LINK':
				// this should never happend the code should never get here
				break;
			case 'NEXT':
				// dont implement it next step type is not going to 
				// be used anymore 
				break
			default:
				break;
		}

		return dialogEngineState;
	}

	private moveThroughLinkSteps() {
		let isLinkStep: boolean = true;
		let currentStepDetails = this.getCurrentStepDetail();

		while (isLinkStep) {
			this.makeTransition(currentStepDetails)
			const nextStep = this.getCurrentStepDetail();
			isLinkStep = nextStep?.type === 'LINK'
		}
	}

	getCurrentStepInfo() {
		// reflect if this is needed...
	}

}

export default DialogEngine;
