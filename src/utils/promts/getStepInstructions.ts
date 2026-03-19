import type { StepPropertyTypes } from '../../core/BussinesLogicTransformer/types'

// TODO this requires a complete implementation implementation
export default function getStepInstructions(stepProperty: StepPropertyTypes) {
	switch (stepProperty.type) {
		case 'ACTION':
			break;
		case "COLLECT":
			let collectInstructions = `
your job it to collect to celllect the {{slot}} slot, 
consdier this: {{note}}
the data type is {{dataType}}
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

	return '';
}

