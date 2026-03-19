export default function buildParsingPromt(params: {
	history: string;
	instructions: string;
	systemPromt: string;
}) {
	let prompt = params.systemPromt;
	prompt = prompt
		.replace("{{history}}", params.history)
		.replace("{{instructions}}", params.instructions);
	return prompt;
}
