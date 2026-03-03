import OpenAI from "openai";
import AppError from "../Errors/AppError";
import { zodTextFormat } from "openai/helpers/zod";
import type { ZodObject } from "zod";

enum Providers {
	OPENIA = 'openai'
}

interface LLmProviderManagerProps {
	model?: string;
}

export interface ResponseInput {
	role: 'user' | 'assistant' | 'developer';
	content: string;
}

class LLmProviderManager {
	private provider: Providers = Providers.OPENIA;
	private model: string = process.env.DEFAULT_OPENIA_MODEL || "";

	constructor(props: LLmProviderManagerProps) {
		this.model = props.model || '';
	}

	private getClient() {
		switch (this.provider) {
			case "openai":
				const openaiClient = new OpenAI();
				return openaiClient;
			default:
				throw new AppError('error initilizing the LLM client')
		}

	}

	// TODO implmeent support for other providers in the future
	async askLLm(inputs: ResponseInput[], responseStructure?: ZodObject | undefined) {
		const client = this.getClient();

		let requestObj: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
			model: this.model,
			input: inputs as OpenAI.Responses.ResponseInput,
		}

		if (responseStructure) {
			let struc = zodTextFormat(responseStructure, "response");
			requestObj.text = requestObj.text || {};
			requestObj.text.format = struc;
		}

		try {
			let res = await client?.responses.create(requestObj)
			return res;
		} catch (error) {
			throw new AppError("error requesting text generation to the LLM service provider")
		}
	}


}

export default LLmProviderManager;
