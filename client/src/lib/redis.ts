import { Redis } from "@upstash/redis";

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN;

export const redis =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : new Proxy({} as Redis, {
        get(target, prop) {
          throw new Error(
            `Redis client was not initialized. Missing UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_URL or UPSTASH_REDIS_REST_TOKEN/UPSTASH_REDIS_TOKEN environment variables.`,
          );
        },
      });
