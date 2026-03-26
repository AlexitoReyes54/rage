import type { StepPropertyTypes } from '../../core/BussinesLogicTransformer/types'
import type { DialogEngineState } from '../../core/DialogEngine/types';

export default function getStepInstructions(stepProperty: StepPropertyTypes, dialogState?: DialogEngineState) {

	const endMsg = dialogState?.isFlowComplete === true ?
		"also the conversation is complete so add a thank you message to the client" :
		""

	switch (stepProperty.type) {
		case 'ACTION':
			let actionInstructions = `
your job it to comumicate the results of a task: {{taskName}}, 
consdier this: {{taskResult}}
${endMsg}
`

			const taskResultUndefined = "there are no results yet";
			return actionInstructions
				.replace("{{taskName}}", stepProperty.actionName)
				.replace("{{taskResult}}", dialogState?.instructionsForLlm?.textInstructions || taskResultUndefined)
		case "COLLECT":
			let collectInstructions = `
your job it to collect to celllect the {{slot}} slot, 
consdier this: {{note}}
the data type is {{dataType}}
${endMsg}
`
			return collectInstructions
				.replace("{{slot}}", stepProperty.slotName)
				.replace("{{note}}", stepProperty.note || '')
				.replace("{{dataType}}", stepProperty.slotType);
		case "LINK":
		case "NEXT":
		default:
			return '';
	}
}

