export type StateName = string;

export interface StateNotification {
	state: StateName;
	transitions: Transition[];
	slots: Map<string, AllowedSlotValues>;
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

export type AllowedSlotValues = string | number | boolean;

export interface SlotsObject {
	[key: string]: AllowedSlotValues;
}

export interface SnapshotObject {
	state: string
	slots: Map<string, AllowedSlotValues>
	timestamp: number;
}
