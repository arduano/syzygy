import CallbackHandler from "langfuse-langchain";
import type { ChatModelOrInvoker, models } from "@trpc-chat-agent/langchain";
export { type ChatModelOrInvoker, models } from "@trpc-chat-agent/langchain";

type PromiseMaybe<T> = T | Promise<T>;

export type SyzygyConfig = {
  chatModel: ChatModelOrInvoker;
  expertModel?: ChatModelOrInvoker;
  callbacks?: CallbackHandler[];
};

/**
 * Configures and returns a Langfuse tracing handler.
 * @param args - Optional configuration parameters for Langfuse.
 * @param args.publicKey - The public API key for Langfuse authentication. If not provided, falls back to LANGFUSE_PUBLIC_API_KEY environment variable.
 * @param args.secretKey - The secret API key for Langfuse authentication. If not provided, falls back to LANGFUSE_SECRET_API_KEY environment variable.
 * @param args.baseUrl - The base URL for the Langfuse API endpoint. If not provided, falls back to LANGFUSE_BASE_URL environment variable.
 * @returns A configured Langfuse CallbackHandler instance for tracing.
 * @throws {Error} If any required parameters (public key, secret key, or base URL) are missing from both args and environment variables.
 */
export function langfuseTracing(args?: {
  /** The public API key for Langfuse. Falls back to LANGFUSE_PUBLIC_API_KEY environment variable. */
  publicKey?: string;
  /** The secret API key for Langfuse. Falls back to LANGFUSE_SECRET_API_KEY environment variable. */
  secretKey?: string;
  /** The base URL for the Langfuse API. Falls back to LANGFUSE_BASE_URL environment variable. */
  baseUrl?: string;
}) {
  const pk = args?.publicKey ?? Deno.env.get("LANGFUSE_PUBLIC_API_KEY");
  const sk = args?.secretKey ?? Deno.env.get("LANGFUSE_SECRET_API_KEY");
  const baseUrl = args?.baseUrl ?? Deno.env.get("LANGFUSE_BASE_URL");

  if (!pk || !sk || !baseUrl) {
    throw new Error(
      "Public key, secret key, and base URL must all be provided either as arguments or environment variables when using Langfuse."
    );
  }

  return new CallbackHandler({
    publicKey: pk,
    secretKey: sk,
    baseUrl: baseUrl,
  });
}
