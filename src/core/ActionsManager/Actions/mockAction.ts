import type { ActionDefinition, ActionResponse } from "../types"

const res: ActionResponse = {
	isComplete: true,
	failureMsg: "none",
	successMsg: "this is a mock function"
}

let mockAction: ActionDefinition<void> = {
	name: "mockAction",
	definition: 'used to test that actions are capable of running ',
	function: () => res,
	expectedProps: []
}

export default mockAction;
