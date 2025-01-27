/**
 * /**
 *  * Retrieves a list of files from a specified glob pattern within the workdir.
 *  * @param globPattern - The glob pattern to match files.
 *  * @returns An array of file paths that match the specified glob pattern.
 *  /\*
 * export async function getFilesFromGlob(globPattern: string): Promise<string[]>;
 */
import { expandGlob } from "https://deno.land/std/fs/mod.ts";

/**
 * Retrieves a list of files from a specified glob pattern within the workdir.
 * @param globPattern - The glob pattern to match files.
 * @returns An array of file paths that match the specified glob pattern.
 */
export async function getFilesFromGlob(globPattern: string): Promise<string[]> {
    const files: string[] = [];
    for await (const file of expandGlob(globPattern, { root: Deno.cwd() })) {
        if (file.isFile) {
            files.push(file.path);
        }
    }
    return files;
}