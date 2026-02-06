import type { StateName, Observer, Transition, StateNotification, AllowedSlotValues, SlotsObject, SnapshotObject } from "./types";
import StatesRegistry from "./StatesRegistry";
import EventManager from "./EventManager";


class StateMachine implements Observer {
	private currentState: StateName;
	private statesRegistry: StatesRegistry = new StatesRegistry();
	private statesGrahp: Map<StateName, Transition[]>;
	private eventManager: EventManager = new EventManager();
	private slotStorage: Map<string, AllowedSlotValues> = new Map();
	onStateChange: null | ((data: StateNotification) => void) = null;

	constructor(initialState: StateName, states: StateName[], transitions: Transition[], slotsObject?: SlotsObject) {
		states.forEach((state) => this.statesRegistry.register(state));
		this.validateInput(initialState, transitions)

		this.statesGrahp = this.buildStateGrahp(transitions)
		this.validateTransitionsInGrahp();
		this.currentState = initialState;
		this.setSlotStorage(slotsObject || {})
		this.eventManager.suscribe(this)
	}

	// GETTERS 

	getCurrentState() {
		return this.currentState;
	}

	getStatesGrahp() {
		return this.statesGrahp
	}

	getAllStates() {
		return this.statesRegistry.getAll();
	}

	// LOGIC

	getAllSlots() {
		return this.slotStorage;
	}

	getSlotValue(slotName: string) {
		this.slotStorage.get(slotName)
	}

	private setSlotStorage(slotsObject: SlotsObject) {
		const validTypes = ["string", "number", "boolean"];
		for (const [key, value] of Object.entries(slotsObject)) {
			if (!validTypes.includes(typeof value)) {
				console.error("error in types ")
				throw new Error('error in types')
			}
			this.slotStorage.set(key, value)
		}
	}

	updateSingleSlot(slotName: string, slotValue: AllowedSlotValues) {
		if (!this.slotStorage.has(slotName)) {
			console.error('this slot dont exists')
			throw new Error("this slot dont exits")
		}
		const slotCurrentValue = this.slotStorage.get(slotName)
		if (typeof slotCurrentValue !== typeof slotValue) {
			console.error('the value is not the correct, the correct type is:', typeof slotCurrentValue)
			throw new Error('the value is not the correct, the correct type is:' + typeof slotCurrentValue)
		}

		this.slotStorage.set(slotName, slotValue)
	}


	update(data: StateNotification): void {
		if (this.onStateChange) {
			this.onStateChange(data);
		}
	}

	transition(transitionName: string) {
		let transitionObject = this.getPossibleTransitions().find(t => t.name === transitionName);

		if (!transitionObject) {
			console.error("this is not a valid move")
			throw new Error("this is not a valid move")
		}

		transitionObject.event();
		this.currentState = transitionObject.to
		this.eventManager.notify({
			state: this.currentState,
			transitions: this.getPossibleTransitions(),
			slots: this.slotStorage
		})
	}

	getPossibleTransitions() {
		let currentStateNode = this.statesGrahp.get(this.currentState) || [];
		return currentStateNode;
	}

	generateSnapshot(): string {
		let snapshot: SnapshotObject = {
			state: this.currentState,
			slots: this.slotStorage,
			timestamp: Date.now()
		}
		return JSON.stringify(snapshot);
	}

	// TODO: i need some type of validation so i know whateveer im loading its not any sting
	recoverFromSnapshot(snapshot: string) {
		const data: SnapshotObject = JSON.parse(snapshot);
		if (this.statesRegistry.isValid(data.state)) {
			this.currentState = data.state;
			this.slotStorage = data.slots
		}
	}

	// UTILS AND VALIDATION 

	private validateTransitionsInGrahp() {
		for (const node of this.statesGrahp) {
			let transitionNames = node[1].map((t) => t.name);
			let transitionsTo = node[1].map((t) => t.to);

			let uniqueTransitionNames = new Set(transitionNames);
			let uniqueTransitionTo = new Set(transitionsTo);

			if (uniqueTransitionNames.size !== transitionNames.length) {
				console.error('there 2 transition with the same "name" value')
				throw new Error('there 2 transition with the same "name" value')
			}

			if (uniqueTransitionTo.size !== transitionsTo.length) {
				console.error('there 2 transition with the same "to" value ')
				throw new Error('there 2 transition with the same "to" value ')
			}
		}
	}

	private buildStateGrahp(transitionsArray: Transition[]) {
		let grahp = new Map<StateName, Transition[]>();
		this.statesRegistry.getAll().forEach((states) => grahp.set(states, []))

		transitionsArray.forEach((transition) => {
			let stateTransitions: Transition[] = grahp.get(transition.from) || [];
			stateTransitions.push(transition)
		})

		return grahp
	}

	private validateInput(initialState: StateName, transitions: Transition[]) {
		if (!this.statesRegistry.isValid(initialState)) {
			throw new Error(`Invalid initial state: ${initialState}`);
		}

		for (const t of transitions) {
			if (!this.statesRegistry.isValid(t.from) || !this.statesRegistry.isValid(t.to)) {
				throw new Error(`Transition "${t.name}" references an unregistered state.`);
			}

		}
	}
}

let mockEvent = () => null;
let states = ['solid', 'liquid', 'gas']
let transitions: Transition[] = [
	{ name: 'melt', from: 'solid', to: 'liquid', event: mockEvent },
	{ name: 'freeze', from: 'liquid', to: 'solid', event: mockEvent },
	{ name: 'vaporize', from: 'liquid', to: 'gas', event: mockEvent },
	{ name: 'condense', from: 'gas', to: 'liquid', event: mockEvent }
]
let slots = {
	name: "Juan",
	age: 19,
	canDrink: true,
}
// TODO implement slot filling strategy for the sate machine 
let machine = new StateMachine('liquid', states, transitions, slots)

machine.onStateChange = (state) => {
	console.log("this changed to: ", state.state)
}
console.log("state", machine.getAllStates());
console.log("ini", machine.getCurrentState());
console.log("moves", machine.getPossibleTransitions());

let action1 = machine.getPossibleTransitions()[0]?.name || ""
console.log("change", action1);
machine.transition(action1);

let action2 = machine.getPossibleTransitions()[0]?.name || ""
console.log("change", action2)
machine.transition(action2);

export default StateMachine;

