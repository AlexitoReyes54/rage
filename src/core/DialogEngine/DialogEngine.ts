import StateMachine from "../StateMachine/StateMachine";
import BussinesLogicTransformer from "../BussinesLogicTransformer/BussinesLogicTransformer";
import AppError from "../Errors/AppError";
import type { StepRegistryRecord } from "../BussinesLogicTransformer/types";
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

	constructor(workflowName: string, stateMachine?: StateMachine) {
		const workflowStateMachine = stateMachine ?? BussinesLogicTransformer
			.getStateMachinesMapStore()
			.get(workflowName)
		const stepsDetailedInfo = BussinesLogicTransformer.getAllWorkflowsStepsInfo()[workflowName]

		if (!workflowStateMachine || !stepsDetailedInfo) {
			throw new AppError('error the state machine your are looking for does not exist while using dialog engine for ' + workflowName);
		}

		this.stepsDetailedInfo = stepsDetailedInfo;
		this.stateMachine = workflowStateMachine;
	}

	intialize() {

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
		// - it has to tell what to send to the user

		let curr = this.stateMachine.getCurrentState();
		let info = this.stepsDetailedInfo.steps[curr];

		//console.log(this.stepsDetailedInfo.nodes);
		console.log('---------------------');
		console.log(this.stepsDetailedInfo.steps);
		console.log('---------------------');
		
		console.log('---------------------');

		// console.log(curr);
		// console.log(info);

		switch (info?.type) {
			case 'COLLECT':
				dialogEngineState.currentStepType = info.type;
				const userInput = collectedData.collectedData;

				// see if the condition are meet if not then tell them to work 
				//
				// 1. are the condition meets ?
				// 	yes => move to the next step
				// 	not => tell the rephraser to do the current step again
				//
				// 2. where are the props ? 
				// 	- i need the props from the understanding 

				if (!userInput) {
					// there is no data in there
					// tell the llm to ask for that information

					// do the same step again
				}


				if (!validateDataType(userInput, info.slotType)) {
					throw new AppError('error collecting user inputs it seems like the llm is not returning the same type as the one defined in the bussine logic file ')
				}


				// here its a yes in principle 
				this.stateMachine.updateSingleSlot(info.slotName, userInput)

				let possibleTransitionList = this.stateMachine.getPossibleTransitions();

				// i need a transition function 
				if (possibleTransitionList.length === 1) {
					const transitionName = possibleTransitionList[0]?.name;
					//console.log(possibleTransitionList[0]);
					this.stateMachine.transition(transitionName);
				} else if (possibleTransitionList.length > 1) {

					// pick the conditional and validat to know if 
					// whare are moving to the 'then' or 'else';
					// how can i do that ????
					//
					//wha i need to make the destion is: 
					// 1. what i have to validate (conditional if any)
					// 2. the diferent sections of the steps then, else, steps 
					// 3. pick based on the existance of the conditional 

					// how can i get the conditional ?????
					// i need to know the node conditioal 
					// i also need easy acces to next node global data
					// not only next step
					//
					// hay que extender el info stero para ademas de los steps 
					// tener los datos por nodos y a que seccino pertenece cada step
					//
					// no quiero hacer cambio en como los steps funcionan 
					// en el info solo es agregar otro field para nodes information 

					console.log(possibleTransitionList);
				}



				// see if collected in the promt 
				// if not then tell the rephraser to get it 
				// if yes update the state machine then pass to the next step

				break;
			case 'ACTION':
				break;
			case 'LINK':
				break;
			case 'NEXT':
				break;

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
