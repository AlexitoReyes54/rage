import type { ActionDefinition, ActionResponse } from "../types"

const res: ActionResponse = { isComplete: true, failureMsg: "none", successMsg: "this is a mock function" }

const mockCalendarBooking = () => { return res; }

let mockAction: ActionDefinition<void> = {
	name: "mockCalendarBooking",
	definition: 'this is a calendar to book meetings',
	function: mockCalendarBooking,
	expectedProps: []
}

export default mockAction;
