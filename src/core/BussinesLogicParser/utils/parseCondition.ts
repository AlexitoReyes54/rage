type Condition = {
	left: string | undefined;
	operator: ">" | ">=" | "<" | "<=" | "==" | "!=";
	right: string | number | boolean | undefined;
};

const CONDITION_REGEX =
	/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(>=|<=|==|!=|>|<)\s*(?:(\d+(?:\.\d+)?)|(true|false)|(["'])(.*?)\5|([a-zA-Z_][a-zA-Z0-9_]*))\s*$/;

export function parseCondition(input: string): Condition {
	const match = input.match(CONDITION_REGEX);
	if (input === "") {
		throw new Error('There is no input value')
	}

	if (!match) {
		throw new Error(`Invalid condition syntax: "${input}"`);
	}

	const [
		,
		left,
		operator,
		numberVal,
		booleanVal,
		,
		stringVal,
		identifierVal,
	] = match;

	let right: string | number | boolean;

	if (numberVal !== undefined) {
		right = Number(numberVal);
	} else if (booleanVal !== undefined) {
		right = booleanVal === "true";
	} else if (stringVal !== undefined) {
		right = stringVal;
	} else {
		throw new Error('Error parsing the intput' + input);
	}

	return {
		left,
		operator: operator as Condition["operator"],
		right,
	};
}
