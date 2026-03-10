import type { ActionDefinitionObject } from "./types"

// actions
import mockAction from "./Actions/mockAction"
import mockCalendarBooking from "./Actions/mockCalendarBooking"

export const actionDefinitions: ActionDefinitionObject = {
	definitions: [mockAction, mockCalendarBooking]
} as const
