const dir = Deno.env.get("SANDBOX_DIR");

if (!dir) {
  throw new Error(
    "SANDBOX_DIR not set. Set it to the directory where the sandbox is located."
  );
}

export const sandboxDir = dir;
