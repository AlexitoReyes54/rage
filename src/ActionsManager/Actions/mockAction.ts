import type { ActionDefinition } from "../types"

let mockAction: ActionDefinition<void, string> = {
	name: "mockAction",
	definition: 'used to test that actions are capable of running ',
	function: () => "this is a mock function"
}

export default mockAction;
