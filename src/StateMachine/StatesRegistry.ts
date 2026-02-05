import type { StateName } from "./types";

export default class StatesRegistry {
	private states = new Set<StateName>();

	register(stateName: StateName): void {
		this.states.add(stateName);
	}

	getAll(): StateName[] {
		return Array.from(this.states);
	}

	isValid(stateName: StateName): boolean {
		return this.states.has(stateName);
	}
}

