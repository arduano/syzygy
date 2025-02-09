import crypto from "node:crypto";
import { kvsLocalStorage } from "@kvs/node-localstorage";
import { findUpSync } from "find-up";
import path from "node:path";

export type CacheableFunction<Args extends any[] = any[], Return = any> = (
  ...args: Args
) => Return;

async function createFunctionCache(name: string, cachePath: string) {
  return await kvsLocalStorage({
    name: `function-cache-${name}`,
    version: 1,
    storeQuota: 20 * 1024 * 1024 * 1024,
    storeFilePath: path.join(cachePath, `function-cache-${name}.kvs`),
  });
}

export function withCache<Args extends any[], Return>(
  fn: CacheableFunction<Args, Return>,
  cacheName: string,
  cachePath: string
): CacheableFunction<Args, Promise<Return>> {
  let cache: Awaited<ReturnType<typeof createFunctionCache>> | undefined;

  return async (...args: Args): Promise<Return> => {
    if (!cache) {
      cache = await createFunctionCache(cacheName, cachePath);
    }

    const argsHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(args))
      .digest("hex");

    const cached = await cache.get(argsHash);
    if (cached !== undefined) {
      return cached as Return;
    }

    const result = await fn(...args);
    await cache.set(argsHash, result as any);
    return result;
  };
}
