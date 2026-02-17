export interface ActionDefinition<TParams = any, TResult = any> {
	name: string;
	definition: string;
	function: (params?: TParams) => TResult;
}

export interface ActionDefinitionObject {
	definitions: ActionDefinition[]
}
