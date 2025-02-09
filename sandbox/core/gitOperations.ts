/**
 * Provides helper functions for performing common Git operations, such as getting the current status, checking out branches, committing changes, and more.
 */

/**
 * Runs a Git command with the specified arguments and returns the output as a string.
 * @param args - An array of string arguments for the Git command.
 * @returns The standard output of the executed command.
 * @throws If the command exits with a non-zero status code,
 *         an error containing the standard error output is thrown.
 */
async function runGitCommand(args: string[]): Promise<string> {
    const command = new Deno.Command('git', {
        args: args,
        stdout: 'piped',
        stderr: 'piped'
    });
    const { code, stdout, stderr } = await command.output();
    if (code !== 0) {
        throw new Error(new TextDecoder().decode(stderr));
    }
    return new TextDecoder().decode(stdout).trim();
}

/**
 * Retrieves the current Git branch and revision SHA-1 in the repository.
 * @returns An object containing the branch name and current revision SHA-1.
 */
export async function gitGetStatus(): Promise<{ branch: string, revision: string }> {
    const branch = await runGitCommand(['rev-parse', '--abbrev-ref', 'HEAD']);
    const revision = await runGitCommand(['rev-parse', 'HEAD']);
    return { branch, revision };
}

/**
 * Checks out to a specified Git branch or revision with options.
 * @param branchOrRev - The branch name or revision to check out.
 * @param options - An array of additional options for the checkout command.
 */
export async function gitCheckout(branchOrRev: string, options: string[] = []): Promise<void> {
    await runGitCommand(['checkout', ...options, branchOrRev]);
}

/**
 * Stages all changes and commits them with a given commit message.
 * @param message - The commit message to use.
 * @returns The SHA-1 of the newly created commit.
 */
export async function gitCommit(message: string): Promise<string> {
    await runGitCommand(['add', '.']);
    await runGitCommand(['commit', '-m', message]);
    return await runGitCommand(['rev-parse', 'HEAD']);
}

/**
 * Pushes committed changes to the remote repository.
 */
export async function gitPush(): Promise<void> {
    await runGitCommand(['push']);
}

/**
 * Pulls the latest changes from the remote repository.
 */
export async function gitPull(): Promise<void> {
    await runGitCommand(['pull']);
}

/**
 * Fetches updates from the remote repository without merging.
 */
export async function gitFetch(): Promise<void> {
    await runGitCommand(['fetch']);
}
