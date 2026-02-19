import type { ActionDefinitionObject } from "./types"

// actions
import mockAction from "./Actions/mockAction"

export const actionDefinitions: ActionDefinitionObject = {
	definitions: [mockAction]
} as const
