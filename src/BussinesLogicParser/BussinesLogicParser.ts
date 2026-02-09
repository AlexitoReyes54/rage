import { YAML } from "bun";
import init from "./init.yml"

class BussinesLogicParser {

	loadYAML() {
		let init_ = YAML.parse(init)
		//
		let s = JSON.stringify(init)
		console.dir(init, {
			depth: null,
			colors: true
		})

	}
}

// TODO just use zod package for the validation is going to be faster and maybe esier to maintain sence its lesss code 
// that i hace to work on
//
let parser = new BussinesLogicParser();
parser.loadYAML()

export default BussinesLogicParser;
