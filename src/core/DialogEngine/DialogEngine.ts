import StateMachine from "../StateMachine/StateMachine";
import BussinesLogicTransformer from "../BussinesLogicTransformer/BussinesLogicTransformer";
import AppError from "../Errors/AppError";
import type { StepPropertyTypes, StepRegistryRecord, CollectStepProperties, ActionStepProperties } from "../BussinesLogicTransformer/types";
import type { Condition, ConditionCompareValueTypes, Operators, StepTypeNames } from "../BussinesLogicParser/types";
import type { AllowedSlotValues } from "../StateMachine/types";
import { ActionsManager } from "../ActionsManager/ActionsManager";
import type { CollectParam, DialogEngineState } from './types';
import executeCompare from "./utils/executeCompare";
import validateDataType from "./utils/validateDataType";
import { object } from "zod/v3";

const validateSteps = (errorMessage: string, ...steps: (string | undefined)[]): void => {
	if (steps.some(step => step === undefined)) {
		throw new Error(errorMessage);
	}
};

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
			throw new AppError('error the state machine your are looking for does not exist while using dialog engine for  ' + workflowName);
		}

		this.workflowName = workflowName;
		this.stepsDetailedInfo = stepsDetailedInfo;
		this.stateMachine = workflowStateMachine;
	}

	private isNodeConditionTrue(conditional: Condition): boolean {
		console.log(conditional);
		const slotName = conditional.left;

		if (!slotName) {
			throw new AppError('there is a conditional referencing to a non existing slot')
		}

		const slotValue = this.stateMachine.getSlotValue(slotName)

		if (slotValue === undefined) {
			throw new AppError('the slot value does not exits in the state machine')
		}

		let isTrue = executeCompare(
			slotValue,
			conditional.operator,
			conditional.right,
			this.workflowName)
		console.log('execution value is: ' + isTrue);
		console.log('slot value is: ' + slotName);

		if (isTrue === undefined) {
			throw new AppError('error during the validation of some conditional in the file' + this.workflowName)
		}

		return isTrue;
	}


	// TODO i have to review why is that when the condition is false 
	// is does not work, it only works when its a yes so take a look 
	// on that
	// also remove all the debbuging logs in this fn
	private makeTransition(currentStepDetails: StepPropertyTypes) {
		let possibleTransitionList = this.stateMachine.getPossibleTransitions();

		if (possibleTransitionList.length === 1 && possibleTransitionList[0]) {
			const transitionName = possibleTransitionList[0]?.name;
			console.log('is here 1 path', currentStepDetails);
			console.log(possibleTransitionList);
			console.log('is here one path', transitionName);
			this.stateMachine.transition(transitionName);
			return;
		}

		// si tines 3 opciones es un link by default 
		if (possibleTransitionList.length === 3 && currentStepDetails.type === "LINK") {
			console.log('is here 3 path', currentStepDetails);


			const pointingNodeName = this.stepsDetailedInfo.nodes[currentStepDetails.link];
			if (!pointingNodeName) {
				throw new AppError('this link step is point to a non existing node ')
			};

			const normalStep = pointingNodeName.steps[0]
			const thenStep = pointingNodeName.evaluation.ifTrue[0]
			const elseStep = pointingNodeName.evaluation.ifFalse[0]
			validateSteps('error some node have undefined steps, node: '
				+ currentStepDetails.link, normalStep, thenStep, elseStep)

			const nextStepDetailsa = this.stepsDetailedInfo.nodes[currentStepDetails.link];
			if (!nextStepDetailsa) throw new AppError('link points to null node' + this.workflowName)

			let firstSTep = nextStepDetailsa.steps[0]
			if (!firstSTep) throw new AppError('first step is null for the ' + this.workflowName)

			const conditionToEvaluate = this.stepsDetailedInfo.steps[firstSTep]?.nodeConditional

			if (!conditionToEvaluate) {
				throw new AppError('there is a link that points to 3 steps but the node it points to has no conditional for file ' + this.workflowName)
			}

			const goTo = this.isNodeConditionTrue(conditionToEvaluate) ? thenStep : elseStep;
			console.log('goTo value ' + goTo);

			//TODO there is a bug it seems like when the condition is false 
			console.log('======================')
			console.log('the goTo value is ' + goTo);
			console.log(goTo === thenStep ? 'the conditonal was true' : 'the conditonal was false');
			console.log('======================')
			console.log(possibleTransitionList);
			

			const transitionWhat = possibleTransitionList.find(t => t.to === goTo);

			if (!transitionWhat) {
				console.log('possibleTransitionList');
				console.log(possibleTransitionList);
				throw new AppError('there is no transiton avilable in the step '
					+ possibleTransitionList[0]?.from + ' to ' + goTo + ' ' + this.workflowName)
			}

			this.stateMachine.transition(transitionWhat.name)
			return;
		}

		throw new AppError('error in the DialogEngine, unknow scenaro where link has not 1 or 3 refeences, see the doc information this was not considering while coding this feature for file' + this.workflowName)
	}


	private processStepCollect(currentStepDetails: CollectStepProperties, dialogEngineState: DialogEngineState) {
		try {
			const userInput = dialogEngineState.collectedData;

			if (userInput === undefined) {
				return false;
			}

			if (!validateDataType(userInput, currentStepDetails.slotType)) {
				throw new AppError('error collecting user inputs it seems like the llm is not returning the same type as the one defined in the bussine logic file ')
			}

			this.stateMachine.updateSingleSlot(currentStepDetails.slotName, userInput)
			return true;

		} catch (error) {
			//TODO refactor when an error happend to be more detailed and have more grace
			return false
		}
	}

	// TODO implement some type of retry system if the action fails
	// TODO update this one to respond with the action respoonde msg so the llm has better info to response 
	// to the user 
	private processStepAction(actionStepDetail: ActionStepProperties, dialogEngineState: DialogEngineState): boolean {
		let propValues: AllowedSlotValues[] = []
		const actionsManager = new ActionsManager();

		if (!actionStepDetail.actionParams) {
			throw new AppError('there are not param values defined insede action step ' + actionStepDetail.actionName)
		}

		actionStepDetail.actionParams.forEach(param => {
			let paramValue = this.stateMachine.getSlotValue(param);
			if (!paramValue) {
				throw new AppError('error this prop was not collected during the workflow ' + param + ' file ' + this.workflowName + ' in the action ' + actionStepDetail.actionName)
			}
			propValues.push(paramValue)
		})

		const response = actionsManager.executeSingleAction(actionStepDetail.actionName, propValues)

		if (!dialogEngineState.instructionsForLlm) {
			dialogEngineState.instructionsForLlm = {};
		}

		if (response.isComplete) {
			dialogEngineState.instructionsForLlm.textInstructions = response.successMsg;
			return true;
		}

		dialogEngineState.instructionsForLlm.textInstructions = response.failureMsg;
		return false;
	}

	private executeStepWorkflow(dialogEngineState: DialogEngineState, processFn: () => boolean) {
		const isComplete = processFn();

		//console.log(dialogEngineState);
		if (!isComplete) {
			console.log('does nothing');
			// send instructionsForLlm for the same step
			return dialogEngineState;
		}

		this.makeTransition(this.getCurrentStepDetail());

		if (this.getCurrentStepDetail()?.type === 'LINK') {
			this.moveThroughLinkSteps();
		}

		const stepAfterLinks = this.getCurrentStepDetail()
		// send instructionsForLlm for stepAfterLinks
		//	dialogEngineState.timesOnThisStep++;
		return dialogEngineState;
	}

	getCurrentStepDetail() {
		let currentStepName = this.stateMachine.getCurrentState();
		let currentStepDetails = this.stepsDetailedInfo.steps[currentStepName];

		if (!currentStepDetails) {
			throw new AppError('the currrent step ' + currentStepName + ' does not exist in workflow ' + this.workflowName)
		}

		return currentStepDetails;
	}

	// error that happends inside this functino has to be habdled with grace 
	// be super carefull with them
	excuteCurrentStep(state?: DialogEngineState): DialogEngineState {
		// this could be a global varible, why not ??/
		let dialogEngineState: DialogEngineState = {
			stateMachine: state?.stateMachine ? state.stateMachine : this.stateMachine,
			stepsDetailedInfo: state?.stepsDetailedInfo ? state.stepsDetailedInfo : this.stepsDetailedInfo,
			instructionsForLlm: state?.instructionsForLlm ? state.instructionsForLlm : {},
			timesOnThisStep: state?.instructionsForLlm ? state.timesOnThisStep : 0,
			collectedData: state?.collectedData !== undefined ? state.collectedData : undefined,
			chatHistory: state?.chatHistory ? state.chatHistory : undefined
		}

		let currentStepDetails = this.getCurrentStepDetail()

		switch (currentStepDetails?.type) {
			case 'COLLECT':
				return this.executeStepWorkflow(
					dialogEngineState,
					() => this.processStepCollect(currentStepDetails, dialogEngineState)
				);
			case 'ACTION':
				return this.executeStepWorkflow(
					dialogEngineState,
					() => this.processStepAction(currentStepDetails, dialogEngineState)
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
