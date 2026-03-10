import type { ActionDefinition } from "../types"

const mockCalendarBooking = () => {
	return ""
}

let mockAction: ActionDefinition<void, string> = {
	name: "mockCalendarBooking",
	definition: 'this is a calendar to book meetings',
	function: mockCalendarBooking
}

export default mockAction;
