// note this was made by AI gemini
interface Job<T> {
	data: T;
	retries?: number;
}

export default class DynamicQueue<T> {
	private queue: Job<T>[] = [];
	private isProcessing = false;

	// You pass the logic (how to handle the job) into the constructor
	constructor(private processor: (data: T) => Promise<void>) { }

	enqueue(data: T, retries = 0) {
		this.queue.push({ data, retries });
		this.process();
	}

	private async process() {
		if (this.isProcessing || this.queue.length === 0) return;

		this.isProcessing = true;
		const currentJob = this.queue.shift();

		if (currentJob) {
			try {
				// Run the dynamic logic provided in the constructor
				await this.processor(currentJob.data);
			} catch (err) {
				console.error("Job failed:", err);
				// Optional: Re-enqueue logic could go here
			}
		}

		this.isProcessing = false;
		this.process();
	}
}
