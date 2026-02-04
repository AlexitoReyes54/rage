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
	readonly stateName: StateName;
	readonly from: string;
	readonly to: string;
	readonly event: () => void;
}

class StateMachine {
	private currentState: StateName;
	private transitions: Transition[];
	private statesRegistry: StatesRegistry = new StatesRegistry();
	private grahedTransitions = new Map<StateName, Transition>();

	constructor(initialState: StateName, transitions: Transition[]) {
		transitions.forEach((transition) => {
			this.statesRegistry.register(transition.stateName)
			this.grahedTransitions.set(transition.stateName, transition)
		})

		transitions.forEach((transition) => {
			if (!this.statesRegistry.isValid(transition.from)) {
				throw new Error("value in the property from is not a valid state")
			}

			if (!this.statesRegistry.isValid(transition.to)) {
				throw new Error("value in the property to is not a valid state")
			}
		})

		if (!this.statesRegistry.isValid(initialState)) {
			throw new Error("initialState does not exits inside the transitions")
		}

		this.currentState = initialState;
		this.transitions = transitions
	}

	getCurrentState(): StateName {
		return this.currentState;
	}

	transition(stateName: StateName): void {
		// here i should move inside the the thing you see bro 
		//i have to know if the movement is valid 

	}

	isValidTransition(stateName: StateName) {
		if (this.grahedTransitions.has(stateName)) {
			// error
		}
		
		// i have to find the edges of this state
		// el grafo no esta bien construido
		this.grahedTransitions.get(stateName)?.to;

	}


}

export default StateMachine;
/// how it should look like: 
//
//
//i pass the init, transitions, and events on each node
