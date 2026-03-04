import StateMachine from "../StateMachine/StateMachine"

// i also need the context of each step like the node and the global 
// descriptions and rules 
class DialogEngine {
	private stateMachine: StateMachine;

	constructor(stateMachine: StateMachine) {
		this.stateMachine = stateMachine;

		let x = this.stateMachine.getCurrentState()
		console.log(x);

	}

	intialize() {

	}

	excuteCurrentStep() {

	}

	getCurrentStepInfo() {

	}

	executeAction() {

	}

	updateSlot() {

	}
}

export default DialogEngine;
