// state machine entry point

import { which } from "bun";

/*
 * what are the requirement for the state machine
	    - I need to have states -- done 
	    - transitions (provoke change on the states) -- node 
	    - self transitions  -- node 
	- transitions to other states
	    - events that can be fired when a transition is trigeres
	- observers 
	- be able to export the state of the machine

	as well as clases to know the state of the machine:
		- be able to see thins as all the states 
		- the state names should be passed as param: 
			- states 
			- events
			- transitions 
		- add the following event to the state machines as func: 
			- know what state im in 
			- see what transitions can be done in the current state
			- observe 
			- see all the machine defined states 
			- see if a transitino is valid as a util
 *
 *
 * warm ice  freeze => liquid => vapor */

type StateName = string;

class StatesRegistry {
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

interface Transition {
	readonly name: string;
	readonly from: string;
	readonly to: string;
	readonly event: () => void;
}

class StateMachine {
	private currentState: StateName;
	private statesRegistry: StatesRegistry = new StatesRegistry();
	private statesGrahp: Map<StateName, Transition[]>;

	constructor(initialState: StateName, states: StateName[], transitions: Transition[]) {
		states.forEach((state) => this.statesRegistry.register(state));
		this.validateInput(initialState, transitions)

		this.statesGrahp = this.buildStateGrahp(transitions)
		this.currentState = initialState;
	}

	// GETTERS 

	getCurrentState() {
		return this.currentState;
	}

	getStatesGrahp() {
		return this.statesGrahp
	}

	// LOGIC

	transition(transitionName: string) {
		// implement an observer pattern in case i want to trigger a side effects
		// as a consecuense to some component outside the events scope
		let transitionObject = this.getPossibleTransitions()
			.map((item) => item.name === transitionName ? item : undefined)
			.filter(Boolean)[0];

		if (!transitionObject) {
			console.error("this is not a valid move")
			throw new Error("this is not a valid move")
		}

		transitionObject.event();
		this.currentState = transitionObject.to
	}


	getPossibleTransitions() {
		let currentStateNode = this.statesGrahp.get(this.currentState) || [];
		return currentStateNode;
	}

	// UTILS AND VALIDATION 

	private buildStateGrahp(transitionsArray: Transition[]) {
		let grahp = new Map<StateName, Transition[]>();
		this.statesRegistry.getAll().forEach((states) => grahp.set(states, []))

		transitionsArray.forEach((transition) => {
			let stateTransitions: Transition[] = grahp.get(transition.from) || [];
			stateTransitions.push(transition)
			grahp.set(transition.from, stateTransitions)
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

		// TODO: we have to validate transition names so they dont repeeat themself there can not be 2 transtions from the the same 
		// state with the same name, that can lead to a bug 

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

let machine = new StateMachine('liquid', states, transitions)

console.log("ini", machine.getCurrentState());
console.log("moves", machine.getPossibleTransitions());

let action1 = machine.getPossibleTransitions()[0]?.name || ""
console.log("change", action1);
machine.transition(action1);
console.log("current", machine.getCurrentState());

let action2 = machine.getPossibleTransitions()[0]?.name || ""
console.log("change",action2 )
machine.transition(action2);
console.log("current", machine.getCurrentState());

export default StateMachine;
/// how it should look like: 
//
//
//i pass the init, transitions, and events on each node
