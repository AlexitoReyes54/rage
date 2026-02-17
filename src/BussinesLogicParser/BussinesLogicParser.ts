import { YAML } from "bun";
import type { StepType, CollectObj, Workflow, Slot, } from "./types";
import { bussinesLogicFile } from "./types"
import { END } from "./constants";
import { parseCondition } from "./utils/parseCondition";
import { validateOperator } from "./utils/validateOperator";
import { hasDuplicates } from "./utils/hasDuplicates";

// test
import init from "./init.yml" // mock file 

function extractValidLinks(
	steps: StepType[],
	nodeIDs: Set<string>
): string[] {
	return steps
		.filter(step => step.type === 'LINK')
		.map(step => step.link)
		.filter(nodeLink => nodeIDs.has(nodeLink) || nodeLink === END)
}


class BussinesLogicParser {
	slotsStorage: Map<string, Slot[]> = new Map();
	slotsObjStore: Map<string, CollectObj> = new Map();

	validateSlots(file: Workflow) {
		let slotCollections = new Map<string, Slot[]>();
		file.process
			.filter(node => node.steps !== undefined)
			.forEach((procesNode) => {

				procesNode.steps
					.filter(step => step.type === "COLLECT")
					.forEach((step) => {

						// TODO in the future we have to handle somehow the validation that is been ignore
						// this.evaluateSlotValidation(step.collect) 

						const collections = slotCollections.get(procesNode.id) ?? [];

						collections.push({
							type: step.collect.type,
							name: step.collect.name
						})

						slotCollections.set(procesNode.id, collections)
					})
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
				throw new Error('error the slot is not defined '+ condition.left)
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


			// TODO make sure the slot used in this condition is not defined inse the same node, is has to be a previus one 
			// to do that i need the flow validation to make sure this is ok 
		})
		return true;
	}

	getLinksInStep(steps: StepType[]) {
		return steps.map(item => item.type === 'LINK');
	}

	validateFlowIsCorrect(file: Workflow) {
		let linksMap = new Map<string, Set<string>>();

		const nodeIDs = new Set<string>();
		file.process.forEach(procesNode => {
			nodeIDs.add(procesNode.id);
			linksMap.set(procesNode.id, new Set())
		})

		file.process.forEach(procesNode => {
			let linksArr = linksMap.get(procesNode.id)
			let sources = [
				procesNode.if?.then,
				procesNode.if?.else,
				procesNode.steps]

			sources.filter(Boolean)
				.flatMap(source => extractValidLinks(source as StepType[], nodeIDs))
				.forEach(item => linksArr?.add(item))
		})

		let allEdges: Set<string> = new Set(Array
			.from(linksMap.values())
			.flatMap(edges => Array.from(edges))
		);

		if (Array.from(allEdges).filter(edgeTo => edgeTo === "END").length !== 1) {
			throw new Error('thers is no END pointer in the bussinesLogicFile or there are more than one END ref')
		}

		Array.from(nodeIDs.values()).map((nodeId, index) => {
			const hasEdge = allEdges.has(nodeId);
			const isEntry = index === 0;

			if (!isEntry && !hasEdge) {
				throw new Error('There is a node without ref: ' + nodeId);
			}
			return { nodeId, hasEdge, isEntry };
		});
	}

	// TODO this has ti revice as a param a YAML file
	loadYAML() {
		const result = bussinesLogicFile.safeParse(init)
		if (result.success) {
			// good 
			this.validateSlots(result.data);
			this.validateContidiontal(result.data);
			// actions are not valid insithe the conditional is has to happend in the steps
			// the flow entry is the first item in the process list of YAML file
			this.validateFlowIsCorrect(result.data)
			// TODO	validateActionsExist

		} else {
			throw new Error("file structre is wrong review the documentation")
		}

		// TODO actions validation has to happend and i need this implementation here in the parser 
		// to make sure whatever action im calling already exist in the code
		// once i make the classe reponsable to orquetrater actions i need to get them all and make sure tha any action call is 
		// insie the list of the one able to use 
	}
}

let parser = new BussinesLogicParser();
parser.loadYAML()

export default BussinesLogicParser;
