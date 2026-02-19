type Operator =
	| ">"
	| "<"
	| ">="
	| "<="
	| "=="
	| "!=";

const allowedOperators: Record<string, Operator[]> = {
	string: ["==", "!="],
	number: [">", "<", ">=", "<=", "==", "!="],
	boolean: ["==", "!="],
};


export function validateOperator(
	right: unknown,
	operator: Operator
): boolean {
	const type = typeof right;

	const allowed = allowedOperators[type];

	if (!allowed) {
		throw new Error(`Unsupported type: ${type}`);
	}

	if (!allowed.includes(operator)) {
		throw new Error(
			`Operator "${operator}" is not allowed for type "${type}"`
		);
	}

	return true;
}
