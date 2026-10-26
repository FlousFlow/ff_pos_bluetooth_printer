export const JOB_STATES = Object.freeze({
    CREATED: "CREATED", QUEUED: "QUEUED", PREPARING: "PREPARING", SENDING: "SENDING",
    TRANSMITTED_UNCONFIRMED: "TRANSMITTED_UNCONFIRMED", WAITING_FOR_PRINTER: "WAITING_FOR_PRINTER",
    FAILED: "FAILED", UNKNOWN_AFTER_DISCONNECT: "UNKNOWN_AFTER_DISCONNECT",
});

/** Serializes transmissions and deduplicates only automatic jobs, never cashier-initiated reprints. */
export class PrintCoordinator {
    constructor() {
        this.tail = Promise.resolve();
        this.automaticJobs = new Set();
        this.activeManualJobs = new Set();
        this.manualSequence = 0;
    }

    enqueue({ orderKey, automatic = false, prepare, send }) {
        const orderIdentifier = String(orderKey);
        const key = automatic ? orderIdentifier : `manual-${++this.manualSequence}`;
        if (automatic && this.automaticJobs.has(key)) return Promise.resolve({ duplicate: true, state: JOB_STATES.QUEUED });
        if (!automatic && this.activeManualJobs.has(orderIdentifier)) return Promise.resolve({ duplicate: true, state: JOB_STATES.QUEUED });
        if (automatic) this.automaticJobs.add(key);
        else this.activeManualJobs.add(orderIdentifier);
        const job = { key, state: JOB_STATES.CREATED };
        job.state = JOB_STATES.QUEUED;
        const run = async () => {
            try {
                job.state = JOB_STATES.PREPARING;
                const payload = await prepare();
                job.state = JOB_STATES.SENDING;
                const result = await send(payload);
                job.state = JOB_STATES.TRANSMITTED_UNCONFIRMED;
                return { ...result, state: job.state };
            } catch (error) {
                job.state = error.transmissionUncertain ? JOB_STATES.UNKNOWN_AFTER_DISCONNECT : JOB_STATES.FAILED;
                return { error, state: job.state };
            } finally {
                if (!automatic) this.activeManualJobs.delete(orderIdentifier);
            }
        };
        const current = this.tail.then(run, run);
        this.tail = current.then(() => undefined, () => undefined);
        return current;
    }
}
