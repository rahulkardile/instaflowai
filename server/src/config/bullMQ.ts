import { Queue } from "bullmq";

export const commentQueue = new Queue(
  "comment-processing",
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
    },
  }
);
