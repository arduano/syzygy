// A dirty script to get changesets working with deno.

// Creates a package.json with the current version
// Runs changesets with the given arguments
// Deletes the created package.json and copies the version back

const denoJson = await Deno.readTextFile("./deno.json");
const { version, name } = JSON.parse(denoJson);

await Deno.writeTextFile(
  "./package.json",
  JSON.stringify(
    {
      name,
      version,
    },
    null,
    2
  )
);

const args = Deno.args;

const process = new Deno.Command("deno", {
  args: ["run", "-A", "npm:@changesets/cli", ...args],
  stderr: "inherit",
  stdout: "inherit",
  stdin: "inherit",
});
process.outputSync();
console.log("Changesets process completed, running version check steps...");

const newPackageJson = await Deno.readTextFile("./package.json");
const { version: newVersion } = JSON.parse(newPackageJson);

if (newVersion !== version) {
  console.log("Version changed:", newVersion);
  await Deno.writeTextFile(
    "./deno.json",
    denoJson.replace(/"version": ".*"/, `"version": "${newVersion}"`)
  );
}

await Deno.remove("./package.json");
