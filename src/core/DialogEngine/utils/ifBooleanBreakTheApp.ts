import type { ConditionCompareValueTypes } from "../../BussinesLogicParser/types"
import AppError from "../../Errors/AppError"

export default function ifBooleanBreakTheApp(value: ConditionCompareValueTypes, fileName: string) {
	if (typeof value === 'boolean') {
		throw new AppError('error some boolean is not using a valid operator in this file' + fileName)
	}
}

