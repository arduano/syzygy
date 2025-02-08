import path from "node:path";
import { SplitFile, splitFileDoc } from "./scriptFileDocs.ts";
import { sandboxDir } from "@/server/system/systemEnv.ts";
import {
  ProjectConfig,
  createDefaultConfig,
  projectConfigSchema,
} from "./projectConfig.ts";

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

  private async ensureDir() {
    try {
      await Deno.mkdir(this.path, { recursive: true });
    } catch (e) {
      if (!(e instanceof Deno.errors.AlreadyExists)) {
        throw e;
      }
    }
  }

  async listScripts() {
    await this.ensureDir();
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
    await this.ensureDir();
    const scripts = await this.listScripts();
    return Object.fromEntries(
      await Promise.all(
        scripts.map(
          async (script) =>
            [
              script,
              await Deno.readTextFile(path.join(this.path, script)),
            ] as const
        )
      )
    );
  }

  getScriptPath(scriptName: string) {
    return path.join(this.path, scriptName);
  }

  async scriptExists(scriptName: string) {
    await this.ensureDir();
    const scriptPath = this.getScriptPath(scriptName);
    try {
      await Deno.stat(scriptPath);
      return true;
    } catch (e) {
      return false;
    }
  }

  async getScript(scriptName: string) {
    await this.ensureDir();
    if (!(await this.scriptExists(scriptName))) {
      return null;
    }

    return Deno.readTextFile(this.getScriptPath(scriptName));
  }

  async writeScript(scriptName: string, text: string) {
    await this.ensureDir();
    await Deno.writeTextFile(this.getScriptPath(scriptName), text);
  }

  async deleteScript(scriptName: string) {
    await this.ensureDir();
    await Deno.remove(this.getScriptPath(scriptName));
  }
}

export class ProjectDb {
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

  async readProjectConfig(projectName: string): Promise<ProjectConfig | null> {
    const configPath = path.join(
      this.rootPath,
      projectsFolder,
      projectName,
      "config.json"
    );
    try {
      const configContent = await Deno.readTextFile(configPath);
      const config = JSON.parse(configContent);
      return projectConfigSchema.parse(config);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        console.error(
          `Error reading config for project ${projectName}:`,
          error
        );
      }
      return null;
    }
  }

  async writeProjectConfig(projectName: string, config: ProjectConfig) {
    const configPath = path.join(
      this.rootPath,
      projectsFolder,
      projectName,
      "config.json"
    );
    await Deno.writeTextFile(configPath, JSON.stringify(config, null, 2));
  }

  async listProjects() {
    const projectsPath = path.join(this.rootPath, projectsFolder);
    const projects = await Deno.readDir(projectsPath);
    const projectsData = [];
    for await (const project of projects) {
      const config = await this.readProjectConfig(project.name);
      if (config) {
        projectsData.push({
          name: project.name,
          config,
        });
      }
    }
    return projectsData;
  }

  async createProject(projectName: string, config: ProjectConfig) {
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

    await this.writeProjectConfig(projectName, config);
    await Deno.writeTextFile(path.join(projectPath, "context.md"), "");

    return config;
  }

  async readProjectContext(projectName: string): Promise<string> {
    const contextPath = path.join(
      this.rootPath,
      projectsFolder,
      projectName,
      "context.md"
    );
    try {
      return await Deno.readTextFile(contextPath);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        await Deno.writeTextFile(contextPath, "");
        return "";
      }
      throw error;
    }
  }
}

export const projectDb = new ProjectDb(sandboxDir);
