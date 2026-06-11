import { Queue } from "bullmq";
import { redis } from "../config/redis";

export const commentQueue = new Queue(
  "comment-processing",
  {
    connection: redis
  }
);