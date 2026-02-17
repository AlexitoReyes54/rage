import { actionDefinitions } from "./actionsDefinitions";

export class ActionsManager {

	getAllAvailableActionsNames(): { name: string, description: string }[] {
		return actionDefinitions.definitions.map(item => {
			return {
				name: item.name,
				description: item.definition
			}
		})
	}

}

export default ActionsManager

