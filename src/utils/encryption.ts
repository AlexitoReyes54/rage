import Cryptr from 'cryptr';

// TODO implement evn varible fot the key
let secret_key = 'nikanika';

const cryptr = new Cryptr(secret_key);

export function encrypt(input: string): string {
	const res = cryptr.encrypt(input);
	return res;
}

export function decrypt(input: string): string {
	const res = cryptr.decrypt(input);
	return res;
}
