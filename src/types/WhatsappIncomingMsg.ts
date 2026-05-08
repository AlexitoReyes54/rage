export interface WhatsappIncomingMsg {
	textMsg: string;
	reciverPhoneNumber: string;
	reciverPhoneNumberID: string;
	sender: {
		userID: string;
		phoneNumber: string;
	};
	type: 'text';
	timestamp: string;
}
