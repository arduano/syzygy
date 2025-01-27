import path from "node:path";
import { SplitFile, splitFileDoc } from "./scriptFileDocs.ts";

const internalsFolder = "core";
const projectsFolder = "projects";
const scriptsFolder = "scripts";

const projectRootDenoJson = `{
  "imports": {
    "@core/": "../../core/",
    "@lib/": "./"
  }
}
`;

const scriptsDenoJson = `{
  "imports": {
    "@core/": "../../../core/",
    "@lib/": "../"
  }
}
`;

class ScriptsFolder {
  path: string;

  constructor(path: string) {
    this.path = path;
  }

  async listScripts() {
    const scriptsPath = path.join(this.path);
    const scripts = await Deno.readDir(scriptsPath);
    const scriptNames = [];
    for await (const script of scripts) {
      if (script.isFile && script.name.endsWith(".ts")) {
        scriptNames.push(script.name);
      }
    }
    return scriptNames;
  }

  async listScriptsWithContents() {
    const scripts = await this.listScripts();
    return Object.fromEntries(
      await Promise.all(
        scripts.map(async (script) => [
          script,
          await Deno.readTextFile(path.join(this.path, script)),
        ])
      )
    );
  }

  getScriptPath(scriptName: string) {
    return path.join(this.path, scriptName);
  }

  async getScript(scriptName: string) {
    return Deno.readTextFile(this.getScriptPath(scriptName));
  }

  async writeScript(scriptName: string, text: string) {
    await Deno.writeTextFile(this.getScriptPath(scriptName), text);
  }

  async deleteScript(scriptName: string) {
    await Deno.remove(this.getScriptPath(scriptName));
  }
}

export class ScriptDb {
  rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  internalFiles() {
    return new ScriptsFolder(path.join(this.rootPath, internalsFolder));
  }

  projectFiles(projectName: string) {
    return new ScriptsFolder(
      path.join(this.rootPath, projectsFolder, projectName)
    );
  }

  projectScriptFiles(projectName: string) {
    return new ScriptsFolder(
      path.join(this.rootPath, projectsFolder, projectName, scriptsFolder)
    );
  }

  async listProjects() {
    const projectsPath = path.join(this.rootPath, projectsFolder);
    const projects = await Deno.readDir(projectsPath);
    const projectNames = [];
    for await (const project of projects) {
      projectNames.push(project.name);
    }
    return projectNames;
  }

  async createProject(projectName: string) {
    const projectPath = path.join(this.rootPath, projectsFolder, projectName);
    await Deno.mkdir(projectPath);

    const projectScriptsPath = path.join(
      this.rootPath,
      projectsFolder,
      projectName,
      scriptsFolder
    );
    await Deno.mkdir(projectScriptsPath);

    await Deno.writeTextFile(
      path.join(projectPath, "deno.json"),
      projectRootDenoJson
    );
    await Deno.writeTextFile(
      path.join(projectScriptsPath, "deno.json"),
      scriptsDenoJson
    );
  }
}

export const scriptDb = new ScriptDb(
  "/home/arduano/programming/scripting-agent/sandbox"
);
