import { Application, Router } from "@oak/oak";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "./context.ts";
import { appRouter } from "@/server/trpc.ts";
import { oakCors } from "@tajpouria/cors";

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

    return withCors(new Response("Not Found", { status: 404 }));
  }
);
