import { Queue, Worker } from 'bullmq';
import notify from "../jobs/bullmq";
import Logger from "./logger";
import config from "../config";

const sosQueue = new Queue('sos-call', {
	connection: {
		...config.bullMq
	}
});

const sosWorker = new Worker('sos-call', async (job) => {
	Logger.info(`Worker picked the job ${job.id}`);
	if (job?.data?.device?.call_priority === "SECURITY_PHONE") {
		notify.notifySecuritys(job);
	} else {
		notify.notifyUsers(job);
	}
}, {
	connection: {
		...config.bullMq
	}
});

sosQueue.on('waiting', ({ id }) => {
	Logger.info(`A job with ID ${id} is waiting`);
});

sosQueue.on('active', ({ id, prev }) => {
	Logger.info(`Job ${id} is now active; previous status was ${prev}`);
});

sosQueue.on('completed', ({ id, returnvalue }) => {
	Logger.info(`${id} has completed and returned ${returnvalue}`);
});

sosQueue.on('failed', ({ id, failedReason }) => {
	Logger.warn(`${id} has failed with reason ${failedReason}`);
});

export default {
	sosQueue,
	sosWorker
};