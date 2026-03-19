import type { DialogEngineState } from './../../core/DialogEngine/types'
import type { StepPropertyTypes } from '../../core/BussinesLogicTransformer/types'
import formatHistoryIntoText from './formatHistoryIntoText'
import buildParsingPromt from './buildParsingPromt'
import { undertandingPromt } from '../../core/LlmProviderManager/promts/undertandingPromt'
import getStepInstructions from './getStepInstructions'

const chatUndertanding = (dialogEngineState: DialogEngineState, stepProperty: StepPropertyTypes): string => {
	let textChatHistory = formatHistoryIntoText(dialogEngineState.chatHistory)
	let instructions = getStepInstructions(stepProperty);
	let promt = buildParsingPromt({
		history: textChatHistory,
		instructions: instructions,
		systemPromt: undertandingPromt
	});
	return promt;
}

export default chatUndertanding;
