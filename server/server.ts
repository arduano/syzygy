import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "./context.ts";
import { appRouter } from "@/server/trpc.ts";
import mime from "npm:mime-types@3.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
} as const;

function withCors<T extends Response>(response: T): T {
  if (!Deno.env.get("VITE_DEV")) return response;

  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

Deno.serve(
  {
    port: 3000,
  },
  async (request) => {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (Deno.env.get("VITE_DEV") && request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (url.pathname.startsWith("/api/trpc")) {
      try {
        const response = await fetchRequestHandler({
          endpoint: "/api/trpc",
          req: request,
          router: appRouter,
          createContext,
        });

        return withCors(response);
      } catch (error: any) {
        console.error("tRPC error:", error);
        return withCors(
          new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
    }

    if (!Deno.env.get("VITE_DEV")) {
      const embeds = await import("../dist/mod.ts");
      const file = await embeds.default.get(url.pathname.slice(1));
      console.log(url.pathname);
      if (!file) {
        const indexFile = await embeds.default.get("index.html");
        if (indexFile) {
          return withCors(
            new Response(await indexFile.bytes(), {
              headers: {
                "content-type": "text/html",
              },
            })
          );
        } else {
          throw new Error("Index file not found");
        }
      }

      return withCors(
        new Response(await file.bytes(), {
          headers: {
            "content-type":
              mime.lookup(url.pathname) || "application/octet-stream",
          },
        })
      );
    }

    return withCors(new Response("Not Found", { status: 404 }));
  }
);
