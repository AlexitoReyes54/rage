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
import areMapsEqual from "../../utils/areMapsEqual";

const validateSteps = (errorMessage: string, ...steps: (string | undefined)[]): void => {
	if (steps.some(step => step === undefined)) {
		throw new Error(errorMessage);
	}
};

class DialogEngine {
	private stateMachine: StateMachine;
	private stepsDetailedInfo: StepRegistryRecord;
	private workflowName: string;
	private dialogEngineState: DialogEngineState;

	constructor(workflowName: string, stateMachine?: StateMachine) {
		const workflowStateMachine = stateMachine ?? BussinesLogicTransformer
			.getStateMachinesMapStore()
			.get(workflowName)?.clone();
		const stepsDetailedInfo = BussinesLogicTransformer.getAllWorkflowsStepsInfo()[workflowName]

		if (!workflowStateMachine || !stepsDetailedInfo) {
			throw new AppError('error the state machine your are looking for does not exist while using dialog engine for  ' + workflowName);
		}

		this.workflowName = workflowName;
		this.stepsDetailedInfo = stepsDetailedInfo;
		this.stateMachine = workflowStateMachine;
		this.dialogEngineState = {
			stateMachine: this.stateMachine,
			stepsDetailedInfo: this.stepsDetailedInfo,
		};

	}

	getCurrentDialogState() {
		return this.dialogEngineState;
	}

	private isNodeConditionTrue(conditional: Condition): boolean {
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

		if (isTrue === undefined) {
			throw new AppError('error during the validation of some conditional in the file' + this.workflowName)
		}

		return isTrue;
	}


	private makeTransition(currentStepDetails: StepPropertyTypes) {
		let possibleTransitionList = this.stateMachine.getPossibleTransitions();

		// TODO implement the end of the workflow
		if (possibleTransitionList.length === 0) {
			// this means is the end, just end the flow do nothing
			return;

		}

		if (possibleTransitionList.length === 1 && possibleTransitionList[0]) {
			const transitionName = possibleTransitionList[0]?.name;
			this.stateMachine.transition(transitionName);
			return;
		}

		if (possibleTransitionList.length === 3 && currentStepDetails.type === "LINK") {
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
			const transition = possibleTransitionList.find(t => t.to === goTo);

			if (!transition) {
				throw new AppError('there is no transiton avilable in the step '
					+ possibleTransitionList[0]?.from + ' to ' + goTo + ' ' + this.workflowName)
			}

			this.stateMachine.transition(transition.name)
			return;
		}

		throw new AppError('error in the DialogEngine, unknow scenaro where link has not 1 or 3 refeences, see the doc information this was not considering while coding this feature for file' + this.workflowName)
	}


	private processStepCollect(currentStepDetails: CollectStepProperties) {
		try {
			const userInput = this.dialogEngineState.collectedData;

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
	private processStepAction(actionStepDetail: ActionStepProperties): boolean {
		let propValues: AllowedSlotValues[] = []
		const actionsManager = new ActionsManager();

		if (!actionStepDetail.actionParams) {
			throw new AppError('there are not param values defined insede action step ' + actionStepDetail.actionName)
		}

		console.log('actions param: ', actionStepDetail.actionParams);

		actionStepDetail.actionParams.forEach(param => {
			let paramValue = this.stateMachine.getSlotValue(param);
			if (paramValue === undefined) {
				throw new AppError('error this prop was not collected during the workflow ' + param + ' file ' + this.workflowName + ' in the action ' + actionStepDetail.actionName)
			}
			propValues.push(paramValue)
		})

		const response = actionsManager.executeSingleAction(actionStepDetail.actionName, propValues)

		if (!this.dialogEngineState.instructionsForLlm) {
			this.dialogEngineState.instructionsForLlm = {};
		}

		if (response.isComplete) {
			this.dialogEngineState.instructionsForLlm.textInstructions = response.successMsg;
			return true;
		}

		this.dialogEngineState.instructionsForLlm.textInstructions = response.failureMsg;
		return false;
	}

	private executeStepWorkflow(processFn: () => boolean) {

		console.log('---------------');
		let currentStepName = this.stateMachine.getCurrentState();
		console.log('currrent step calling execute:', currentStepName);
		console.log('---------------');
		const nextStep = this.getCurrentStepDetail();
		// this can never happend bc i can never set 
		// in a step of type LINK, plus if i set this before the actions or whatever it does it wont send the currrent sttep result information
		if (nextStep?.type === 'LINK' && nextStep.link === 'END') {
			this.dialogEngineState.isFlowComplete = true;
			return this.dialogEngineState;
		}

		const isComplete = processFn();

		if (!isComplete) {
			// send instructionsForLlm for the same step
			return this.dialogEngineState;
		}

		this.makeTransition(this.getCurrentStepDetail());

		if (this.getCurrentStepDetail()?.type === 'LINK') {
			this.moveThroughLinkSteps();
		}


		// i dont think this is necessary
		const stepAfterLinks = this.getCurrentStepDetail()
		// send instructionsForLlm for stepAfterLinks
		//	dialogEngineState.timesOnThisStep++;
		return this.dialogEngineState;
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

		if (state?.stateMachine) {	
			console.log('im evem passing a new state machinea');
			let areTheSame = areMapsEqual(this.stateMachine.getStatesGrahp(), state?.stateMachine?.getStatesGrahp());
			if (!areTheSame) throw new Error('passing a diferent state machine from the one at inisilization')
		}

		this.dialogEngineState = {
			stateMachine: state?.stateMachine ? state.stateMachine : this.stateMachine,
			stepsDetailedInfo: state?.stepsDetailedInfo ? state.stepsDetailedInfo : this.dialogEngineState.stepsDetailedInfo,
			instructionsForLlm: state?.instructionsForLlm ? state.instructionsForLlm : this.dialogEngineState.instructionsForLlm,
			timesOnThisStep: state?.instructionsForLlm ? state.timesOnThisStep : this.dialogEngineState.timesOnThisStep,
			collectedData: state?.collectedData !== undefined ? state.collectedData : this.dialogEngineState.collectedData,
			chatHistory: state?.chatHistory ? state.chatHistory : this.dialogEngineState.chatHistory,
			isFlowComplete: state?.isFlowComplete !== undefined ? state?.isFlowComplete : this.dialogEngineState.isFlowComplete,
		}

		let currentStepDetails = this.getCurrentStepDetail()

		switch (currentStepDetails?.type) {
			case 'COLLECT':
				return this.executeStepWorkflow(
					() => this.processStepCollect(currentStepDetails)
				);
			case 'ACTION':
				return this.executeStepWorkflow(
					() => this.processStepAction(currentStepDetails)
				);
			case 'LINK':
			case 'NEXT':
			default:
				// this should never happend the code should never get here
				break;
		}
		return this.dialogEngineState;
	}

	private moveThroughLinkSteps() {
		let isLinkStep: boolean = true;
		let currentStepDetails = this.getCurrentStepDetail();

		while (isLinkStep) {
			this.makeTransition(currentStepDetails)
			const nextStep = this.getCurrentStepDetail();
			isLinkStep = nextStep?.type === 'LINK' && nextStep.link !== 'END'
			if (nextStep?.type === 'LINK' && nextStep.link === 'END') {
				this.dialogEngineState.isFlowComplete = true;
			}
		}
	}

	getCurrentStepInfo() {
		// reflect if this is needed...
	}

}

export default DialogEngine;
