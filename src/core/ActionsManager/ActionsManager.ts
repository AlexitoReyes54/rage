import AppError from "../Errors/AppError";
import { actionDefinitions } from "./actionsDefinitions";
import type { AllowedSlotValues } from "../StateMachine/types";

export class ActionsManager {

	getAllAvailableActions(): { name: string, description: string }[] {
		return actionDefinitions.definitions.map(item => {
			return {
				name: item.name,
				description: item.definition
			}
		})
	}

	executeSingleAction(actionName: string, actionProps: AllowedSlotValues[]) {
		const action = actionDefinitions.definitions.find(a => a.name === actionName)

		if (!action) {
			throw new AppError('error there is no actions with that name ');
		}

		if (actionProps.length !== action.expectedProps.length) {
			throw new AppError('error the number of params passed to this action is not correct ' + actionName);
		}

		let propObj: any = {};
		action.expectedProps.forEach((expectedProp, index) => {
			propObj[expectedProp] = actionProps[index]
		})
		console.log('propObj:', propObj);
		

		return action.function(propObj);
	}

}

export default ActionsManager

