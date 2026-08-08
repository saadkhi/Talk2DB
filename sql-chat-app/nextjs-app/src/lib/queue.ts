import { Queue, QueueEvents } from "bullmq";

const connection = {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
};

export const reportQueue = new Queue("reportQueue", { connection });
export const reportQueueEvents = new QueueEvents("reportQueue", { connection });
