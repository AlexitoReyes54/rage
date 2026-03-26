
import type { DialogEngineState } from './../../core/DialogEngine/types'
import type { StepPropertyTypes } from '../../core/BussinesLogicTransformer/types'
import formatHistoryIntoText from './formatHistoryIntoText'
import buildParsingPromt from './buildParsingPromt'
import getStepInstructions from './getStepInstructions'
// TODO improve the response_promt has to much space for improvement
import { responsePromt } from '../../core/LlmProviderManager/promts/responsePromt'

// TODO re-think promt structures, now all promts recive, the chat history and the instructions;
// TODO this is a duplicate fromt the undertaning of genrarion pront fn int this same directory
export default function getResponsePromt(dialogEngineState: DialogEngineState, stepProperty: StepPropertyTypes): string {
	let textChatHistory = formatHistoryIntoText(dialogEngineState.chatHistory)
	let instructions = getStepInstructions(stepProperty, dialogEngineState);
	console.log('current resoponse instructions: \n', instructions);
	
	let promt = buildParsingPromt({
		history: textChatHistory,
		instructions: instructions,
		systemPromt: responsePromt
	});
	return promt;
}
