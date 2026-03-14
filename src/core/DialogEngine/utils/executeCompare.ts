import type { ConditionCompareValueTypes } from "../../BussinesLogicParser/types";
import type { Operators } from "../../BussinesLogicParser/types";
import ifBooleanBreakTheApp from "./ifBooleanBreakTheApp";

export default function executeCompare(
	value: ConditionCompareValueTypes,
	operator: Operators,
	valueToMatch: ConditionCompareValueTypes,
	fileName: string
) {
	const mathOperators: Operators[] = ['>', '<', '>=', '<='];

	if (mathOperators.includes(operator)) {
		ifBooleanBreakTheApp(value, fileName);
	}

	const operations: Record<string, (a: ConditionCompareValueTypes, b: ConditionCompareValueTypes) => boolean> = {
		'>': (a, b) => a > b,
		'<': (a, b) => a < b,
		'>=': (a, b) => a >= b,
		'<=': (a, b) => a <= b,
		'==': (a, b) => a == b,
		'!=': (a, b) => a != b,
	};

	return operations[operator]?.(value, valueToMatch);
}
