import { YAML } from "bun";
import * as z from "zod";

// mock file for testing aa
import init from "./init.yml"


const bussinesLogicFile = z.object({
	process: z.array(z.any())
});

// 1. First, define the core primitives

type SlotTypes = "string" | "number" | "boolean";

const SlotTypes = z.enum(["string", "number", "boolean"]);
const StepType = z.enum(["LINK", "COLLECT"]);

const CollectStep = z.object({
	type: z.literal("COLLECT"),
	collect: z.object({
		name: z.string(),
		type: SlotTypes,
		note: z.string().optional(),
		validation: z.string().optional(),
	}),
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
	else: Steps.optional(),
});

//3. Process schema
const Process = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	if: Conditional.optional(),
	steps: Steps.optional(),
});

//4. Full file schema (global scope)

const ProcessFile = z.object({
	process: z.array(Process),
	ask_before_filling: z.boolean().optional(),
});


type Workflow = z.infer<typeof ProcessFile>;
type StepType = z.infer<typeof Step>

type StepTypeNames = "LINK" | "COLLECT" | "UNDEFINED"


function hasDuplicates<T>(arr: T[]) {
	return new Set(arr).size !== arr.length;
}

class BussinesLogicParser {

	slotsStorage: Map<string, typeof Step> = new Map();

	// 2. validate slots	
	// 	- to do that we have to make sure we collect all the 
	// 	collect item in the Process
	// 	- no conditional can use a slot if that is not defined 
	// 	in a previus process item
	// 	- no use non existen slots 
	// 	validate data type

	validateSlots(file: Workflow) {

		interface Slot {
			type: SlotTypes,
			name: string,
		}

		let slotCollections = new Map<string, Slot[]>();
		// 1. find all the slots 
		// 2. make sure no one is used before collected 
		// make sure is not repeated

		file.process.forEach((processStep) => {
			if (processStep.steps) {
				processStep.steps.forEach((step) => {
					if (step.type === "COLLECT") { // use types here and not a single string
						console.log(step.collect.name);

						// this logic is wrong is not looking at the right id
						if (!slotCollections.has(processStep.id)) {
							// before add i need to validate its not repeated

							let values = slotCollections.values().reduce((prevValue, currentValue) => {
								return [...currentValue];
							}, [])

							slotCollections.set(processStep.id, [{
								type: step.collect.type,
								name: step.collect.name
							}])
						}

						let slowRow = slotCollections.get(processStep.id)
						// before add i need to validate its not repeated
						slowRow?.push({
							type: step.collect.type,
							name: step.collect.name
						})

					}

				})
			}
		})

		// default 
		let size = slotCollections.size;
		//console.log([...slotCollections], size)
		console.log(slotCollections)

	}

	loadYAML() {
		let init_ = YAML.parse(init)
		const result = bussinesLogicFile.safeParse(init)
		if (result.success) {
			// good 
			// console.log(result.data);
			this.validateSlots(result.data)
		} else {
			console.log(result.error);
			// errror
		}


		// steps to implement this parser 
		// what this component has to do ? ????
		//
		// 1. validate the structre -- done with zod 
		//
		// 2. validate slots	
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
	}
}

// TODO just use zod package for the validation is going to be faster and maybe esier to maintain sence its lesss code 
// that i hace to work on
//
let parser = new BussinesLogicParser();
parser.loadYAML()

export default BussinesLogicParser;
