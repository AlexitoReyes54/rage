import { which, YAML } from "bun";
import * as z from "zod";

// mock file for testing aa
import init from "./init.yml"
import { parseCondition } from "./utils/parseCondition";
import { validateOperator } from "./utils/validateOperator";
import { omit } from "zod/mini";

const bussinesLogicFile = z.object({
	process: z.array(z.any())
});

// 1. First, define the core primitives

type SlotTypes = "string" | "number" | "boolean";

const SlotTypes = z.enum(["string", "number", "boolean"]);
const StepType = z.enum(["LINK", "COLLECT"]);

const CollectObject = z.object({
	name: z.string(),
	type: SlotTypes,
	note: z.string().optional(),
	validation: z.string().optional(),
});

const CollectStep = z.object({
	type: z.literal("COLLECT"),
	collect: CollectObject
});

const LinkStep = z.object({
	type: z.literal("LINK"),
	link: z.string(), // process id reference
});

const NextEndStep = z.object({
	type: z.literal("NEXT"),
	next: z.literal("END"),
});

const Step = z.union([CollectStep, LinkStep, NextEndStep]);
const Steps = z.array(Step);

// 2. Conditional block

const Conditional = z.object({
	condition: z.string(),
	then: Steps,
	else: Steps,
});

//3. Process schema
const Process = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	if: Conditional.optional(),
	steps: Steps,
});

//4. Full file schema (global scope)

const ProcessFile = z.object({
	process: z.array(Process),
	ask_before_filling: z.boolean().optional(),
});


type Workflow = z.infer<typeof ProcessFile>;
type StepType = z.infer<typeof Step>
type LinkStepType = z.infer<typeof LinkStep>

type LINK = "LINK"
type COLLECT = "COLLECT"
type UNDEFINED = "UNDEFINED"

type StepTypeNames = LINK | COLLECT | UNDEFINED


interface Slot {
	type: SlotTypes,
	name: string,
}

type CollectObj = z.infer<typeof CollectObject>;

function hasDuplicates<T>(arr: T[]) {
	return new Set(arr).size !== arr.length;
}



function extractValidLinks(
	steps: StepType[],
	nodeIDs: Set<string>
): string[] {
	return steps
		.filter(step => step.type === 'LINK')
		.map(step => step.link)
		.filter(nodeLink => nodeIDs.has(nodeLink))
}


// use types here and not a single string
class BussinesLogicParser {
	slotsStorage: Map<string, Slot[]> = new Map();
	slotsObjStore: Map<string, CollectObj> = new Map();

	// TODO refactor this to have less indentation and its easier to read 
	validateSlots(file: Workflow) {
		let slotCollections = new Map<string, Slot[]>();
		file.process.forEach((procesNode) => {

			if (procesNode.steps) {
				procesNode.steps.forEach((step) => {

					if (step.type === "COLLECT") {

						// TODO in the future we have to handle somehow the validation that is been ignore
						// this.evaluateSlotValidation(step.collect) 
						if (!slotCollections.has(procesNode.id)) {
							slotCollections.set(procesNode.id, [{
								type: step.collect.type,
								name: step.collect.name
							}])
						} else {
							let slowRow = slotCollections.get(procesNode.id)
							slowRow?.push({
								type: step.collect.type,
								name: step.collect.name
							})
						}

					}

				})
			}
		})

		const allSlotsArray = Array.from(slotCollections.values()).reduce<Slot[]>((acc, items) => {
			if (hasDuplicates(items.map(slot => slot.name))) {
				throw new Error("There are duplicated collect(slot names) in a single node");
			}
			items.map(item => this.slotsObjStore.set(item.name, item))
			acc.push(...items);
			return acc;
		}, []);

		if (hasDuplicates(allSlotsArray.map(slot => slot.name))) {
			throw new Error("there are duplicated slot names in the file review all the nodes")
		}


		return slotCollections;
	}

	validateContidiontal(file: Workflow) {

		file.process.forEach(procesNode => {
			if (!procesNode.if) {
				return false;
			}

			const condition = parseCondition(procesNode.if?.condition || "")

			if (!condition.right || !condition.operator || !condition.left) {
				throw new Error('Error parsing the conditioal')
			}

			if (!this.slotsObjStore.has(condition.left)) {
				throw new Error('error the slot is not defined')
			}

			if (this.slotsObjStore.get(condition.left)?.type !== typeof condition.right.valueOf()) {
				throw new Error('the slot is not the same data type as the right value ' + condition.left)
			}

			if (!validateOperator(condition.right, condition.operator)) {
				throw new Error('the operator is not valid for the data type of the slot')
			}

			if (!procesNode.if.else) {
				throw new Error('the else section of the conditional can not be null')
			}

			// importat : actions are not valid inside the conditional, they can only be executed on the steps
			if (!procesNode.if.then.some(action => action.type === "NEXT" || action.type === "LINK")) {
				throw new Error('there is no way to get out of the "then" block inside ' + procesNode.id)
			}

			if (!procesNode.if.else.some(action => action.type === "NEXT" || action.type === "LINK")) {
				throw new Error('there is no way to get out of the "else" block inside ' + procesNode.id)
			}


			// make sure the slot used in this condition is not defined inse the same node, is has to be a previus one 
			//
			// to do that i need the flow validation to make sure this is ok 
		})
		return true;
	}


	getLinksInStep(steps: StepType[]) {
		return steps.map(item => item.type === 'LINK');
	}



	validateFlowIsCorrect(file: Workflow) {
		// what i need here to make this Workflow
		// 1. flow entry -- done 
		// 2. all the names id so i know that references  are valid -- done 
		// 3. a grahp to know its all valid 
		// 4. there can not be any free node with no referent 
		// 5. there has to be an end to the thing
		//
		//
		// the flow entry is the first item in the process list of 
		// the yaml file
		let linksMap = new Map<string, string[]>();

		const nodeIDs = new Set<string>();
		file.process.forEach(procesNode => {
			nodeIDs.add(procesNode.id);
			linksMap.set(procesNode.id, [])
		})

		file.process.forEach(procesNode => {

			let linksArr = linksMap.get(procesNode.id)
			if (!procesNode.steps) {
				throw new Error('there is some null value in steps in here ' + procesNode.id)
			}

			if (procesNode.if) {
				let conditionTrue = extractValidLinks(procesNode.if?.then, nodeIDs);
				let conditionFalse = extractValidLinks(procesNode.if?.else, nodeIDs)

				linksArr?.push(...conditionTrue,...conditionFalse)
			}

			let step = extractValidLinks(procesNode.steps, nodeIDs)

			// TODO remove duplicates from the linksArr
			linksArr?.push(...step)
			console.log({
				step,
			});
		})

		console.log(linksMap);
		console.log(nodeIDs);
	}

	loadYAML() {
		let init_ = YAML.parse(init)
		const result = bussinesLogicFile.safeParse(init)
		if (result.success) {
			// good 
			this.validateSlots(result.data);
			this.validateContidiontal(result.data);
			this.validateFlowIsCorrect(result.data)
		} else {
			throw new Error("file structre is wrong review the documentation")
		}


		// steps to implement this parser 
		// what this component has to do ? ????
		//
		// 1. validate the structre -- done with zod 
		//
		// 2. validate slots	 -- done
		// 	- to do that we have to make sure we collect all the 
		// 	collect item in the Process
		// 	- no conditional can use a slot if that is not defined 
		// 	in a previus process item
		// 	- no use non existen slots 
		// 	validate data type
		//
		//
		// 3. validate conditionals
		// 	-  3make sure all condition are comparing using the right type of comparinson based on the data type

		// 4. validate flow has and end and there are not open end
		// 5.
		//
		// TODO actions validation has to happend and i need this implementation here in the parser 
		// to make sure whatever action im calling already exist in the code
		// once i make the classe reponsable to orquetrater actions i need to get them all and make sure tha any action call is 
		// insie the list of the one able to use 
	}
}

let parser = new BussinesLogicParser();
parser.loadYAML()

export default BussinesLogicParser;
