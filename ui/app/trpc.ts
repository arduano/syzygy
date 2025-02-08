import type { AppRouter } from "@/server/trpc.ts";
import { splitLink, unstable_httpBatchStreamLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";

export const trpc = createTRPCReact<AppRouter>();

// deno-lint-ignore ban-ts-comment
// @ts-ignore
const baseUrl = import.meta.env.VITE_DEV ? "http://localhost:3000" : "";

export const trpcClient = trpc.createClient({
  links: [
    splitLink({
      condition: (op) => op.path.includes("promptChat"),
      true: unstable_httpBatchStreamLink({
        url: `${baseUrl}/api/trpc`,
        methodOverride: "POST",
      }),
      false: unstable_httpBatchStreamLink({
        url: `${baseUrl}/api/trpc`,
      }),
    }),
  ],
});
