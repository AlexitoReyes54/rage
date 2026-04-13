import { expect, test, describe, beforeAll, beforeEach } from "bun:test";
import DialogEngine from "../src/core/DialogEngine/DialogEngine";
import BussinesLogicTransformer from "../src/core/BussinesLogicTransformer/BussinesLogicTransformer";
import loadAllYmlFiles from '../src/lib/loaders';
import StateMachine from "../src/core/StateMachine/StateMachine";
import type { Transition } from "../src/core/StateMachine/types";
import areMapsEqual from "../src/utils/areMapsEqual";

await loadAllYmlFiles();
const testWorkflowName: string = 'medical';
const testWorkFlowExist = BussinesLogicTransformer.getWorkflowsMapStore().get(testWorkflowName) !== undefined ? true : false;

let mockEvent = () => null;
let states = ['solid', 'liquid', 'gas']
let transitions: Transition[] = [
	{ name: 'melt', from: 'solid', to: 'liquid', event: mockEvent },
	{ name: 'freeze', from: 'liquid', to: 'solid', event: mockEvent },
	{ name: 'vaporize', from: 'liquid', to: 'gas', event: mockEvent },
	{ name: 'condense', from: 'gas', to: 'liquid', event: mockEvent }
]

let waterMachine = new StateMachine('liquid', states, transitions)
describe("Dialog engine", () => {

	test.if(testWorkFlowExist)("load state machine from transformer | test medical workflow", () => {
		let machine = new DialogEngine(testWorkflowName).getCurrentDialogState();
		expect(machine.stateMachine?.getCurrentState()).toBe('greet_COLLECT_patient_name');
	});

	test.todo("don't recive a steta machine different from the initialization one", () => {
		let engine = new DialogEngine(testWorkflowName);
		let state = engine.getCurrentDialogState();

		expect(state.stateMachine).not.toBe(undefined);

		state.stateMachine = waterMachine;
		expect(() => engine.excuteCurrentStep(state)).toThrow()
	});

	test.todo("state machine is not sharing state", () => {
		// TODO i have to test how is this sharing states between 
		
		let machine = new DialogEngine(testWorkflowName);
		
		let state = machine.excuteCurrentStep({collectedData:'demo name'});
		console.log(state);
		expect(2 * 2).toBe(4);
	});
	
	test.todo("effectively collect strings", () => {
		expect(2 * 2).toBe(4);
	});

	test.todo("effectively collect boolean", () => {
		expect(2 * 2).toBe(4);
	});

	test.todo("effectively collect numbers", () => {
		expect(2 * 2).toBe(4);
	});

	test.todo("actions are triggered properly", () => {
		expect(2 * 2).toBe(4);
	});

});
