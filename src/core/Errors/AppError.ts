export default class AppError extends Error {
	readonly isOperational;
	constructor(message: string) {
		super(message);
		this.name = "AppError";
		this.isOperational = true;
		Error.captureStackTrace(this, this.constructor);
	}
}
