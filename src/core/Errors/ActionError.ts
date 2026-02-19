export default class ActionError extends Error {
	readonly isOperational;
	constructor(message: string) {
		// ActionError message's should be formated so the LLM model can read it
		super(message);
		this.name = "ActionError";
		this.isOperational = true;
		Error.captureStackTrace(this, this.constructor);
	}
}
