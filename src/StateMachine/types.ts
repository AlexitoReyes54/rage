export type StateName = string;

export interface StateNotification {
	state: StateName,
	transitions: Transition[]
}

export interface Observer {
	update(data: any): void;
}

export interface Transition {
	readonly name: string;
	readonly from: string;
	readonly to: string;
	readonly event: () => void;
}

export interface EventManager {
	suscribe(observer: Observer): void;
	unSuscribe(observer: Observer): void;
	notify(data: any): void;
}
