import CallbackHandler from "langfuse-langchain";

function getLangfuse() {
  const pk = Deno.env.get("LANGFUSE_PUBLIC_API_KEY");
  const sk = Deno.env.get("LANGFUSE_SECRET_API_KEY");
  const baseUrl = Deno.env.get("LANGFUSE_BASE_URL");

  if (!pk && !sk && !baseUrl) {
    return undefined;
  }

  if (!pk || !sk || !baseUrl) {
    throw new Error(
      "LANGFUSE_PUBLIC_API_KEY, LANGFUSE_SECRET_API_KEY, and LANGFUSE_BASE_URL must all be set when using langfuse."
    );
  }

  return new CallbackHandler({
    publicKey: pk,
    secretKey: sk,
    baseUrl: baseUrl,
  });
}

export const langfuseHandler = getLangfuse();
export const langfuseCallbacks = langfuseHandler ? [langfuseHandler] : [];
