import type { ResponseInput } from "../../core/LlmProviderManager/LlmProviderManager";

export default function formatHistoryIntoText(chathistory: ResponseInput[] | undefined): string {
	let chats = chathistory;

	if (!chats) {
		return '';
	}

	return chats.map(msg => {
		return msg.role === 'user' ? `U: ${msg.content}` : `B: ${msg.content}`
	}).join('\n');
}
