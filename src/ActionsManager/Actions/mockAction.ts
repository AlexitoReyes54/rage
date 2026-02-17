import type { ActionDefinition } from "../types"

let mockFn = () => {
	return "this is a mock function"
}

let mockAction: ActionDefinition<void, string> = {
	name: "mock action",
	definition: 'used to test that actions are capable of running ',
	function: mockFn
}

export default mockAction;
