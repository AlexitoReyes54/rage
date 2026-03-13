export interface ActionResponse {
	isComplete: boolean;
	successMsg: string;
	failureMsg: string
}

export interface ActionDefinition<TParams = any> {
	name: string;
	definition: string;
	function: (params?: TParams) => ActionResponse;
	expectedProps: string[]
}

export interface ActionDefinitionObject {
	definitions: ActionDefinition[]
}
