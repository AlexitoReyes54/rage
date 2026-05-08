export interface WhatsAppProfile {
	name: string;
}

export interface WhatsAppContact {
	profile: WhatsAppProfile;
	wa_id: string;
}

export interface WhatsAppMetadata {
	display_phone_number: string;
	phone_number_id: string;
}

export interface WhatsAppMessage {
	from: string;
	from_user_id: string;
	id: string;
	timestamp: string;
	type: string;
	text?: {
		body: string;
	};
	image?: { id: string; mime_type: string; sha256: string; caption?: string };
	audio?: { id: string; mime_type: string; sha256: string };
	document?: {
		id: string;
		mime_type: string;
		sha256: string;
		filename: string;
	};
	location?: {
		latitude: number;
		longitude: number;
		name?: string;
		address?: string;
	};
	contacts?: Array<{
		name: { first_name: string; last_name?: string };
		phones: Array<{ phone: string; type?: string }>;
	}>;
}

export interface WhatsAppChange {
	field: string;
	value: {
		messaging_product: string;
		metadata: WhatsAppMetadata;
		contacts: WhatsAppContact[];
		messages: WhatsAppMessage[];
	};
}

export interface WhatsAppEntry {
	id: string;
	changes: WhatsAppChange[];
}

export interface WhatsAppWebhookBody {
	object: string;
	entry: WhatsAppEntry[];
}
