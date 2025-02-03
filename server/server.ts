import { Application, Router } from "@oak/oak";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "./context.ts";
import { appRouter } from "@/server/trpc.ts";
import { oakCors } from "@tajpouria/cors";

const app = new Application();
const oakRouter = new Router();

if (Deno.env.get("VITE_DEV")) {
  console.log("Running in DEV mode");
  app.use(
    oakCors({
      origin: "*",
      methods: ["GET", "POST", "OPTIONS"],
    })
  );
}

// tRPC handler
oakRouter.all("/api/trpc/:path*", async (ctx) => {
  const req = new Request(ctx.request.url, {
    method: ctx.request.method,
    headers: ctx.request.headers,
    body:
      ctx.request.method === "POST" ? await ctx.request.body.blob() : undefined,
  });

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
  });

  ctx.response.status = response.status;
  response.headers.forEach((value, key) => {
    ctx.response.headers.set(key, value);
  });
  ctx.response.body = async function* () {
    const stream = await response.body?.getReader();
    if (!stream) return;
    while (true) {
      const { value, done } = await stream.read();
      if (done) {
        break;
      }
      yield value;
    }
  };
});

app.use(oakRouter.routes());
app.use(oakRouter.allowedMethods());

// Start the server
const port = 3000;
console.log(`Server running on http://localhost:${port}`);

await app.listen({ port });
