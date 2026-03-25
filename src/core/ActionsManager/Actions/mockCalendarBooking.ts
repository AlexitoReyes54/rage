import type { ActionDefinition, ActionResponse } from "../types"

const res: ActionResponse = { isComplete: true, failureMsg: "sorry i can not book your meetiing now", successMsg: "your meetiing was booked successfully" }

const mockCalendarBooking = () => {
	console.log('mockCalendarBooking fired');
	return res;
}

let mockAction: ActionDefinition<void> = {
	name: "mockCalendarBooking",
	definition: 'this is a calendar to book meetings',
	function: mockCalendarBooking,
	expectedProps: ["patient_name", "is_emergency", "pain_level", "preferred_date"]
}
export default mockAction;
