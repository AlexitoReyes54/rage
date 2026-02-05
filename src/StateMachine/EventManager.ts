import type { EventManager as EventManagerInterface, Observer, StateNotification } from "./types"

export default class EventManager implements EventManagerInterface {
	private suscribers: Set<Observer> = new Set();

	suscribe(observer: Observer) {
		this.suscribers.add(observer)
	}

	unSuscribe(observer: Observer) {
		this.suscribers.delete(observer)
	}

	notify(data: StateNotification) {
		this.suscribers.forEach((suscriber) => suscriber.update(data))
	}
}


