/**
 * async function runGitCommand(args: string[]): Promise<string>
 * 
 * export async function gitGetStatus(): Promise<{ branch: string, revision: string }>
 * export async function gitCheckout(branchOrRev: string, options: string[] = []): Promise<void>
 * export async function gitCommit(message: string): Promise<string>
 * export async function gitPush(): Promise<void>
 * export async function gitPull(): Promise<void>
 * export async function gitFetch(): Promise<void>
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

export async function gitGetStatus() {
    const branch = await runGitCommand(['rev-parse', '--abbrev-ref', 'HEAD']);
    const revision = await runGitCommand(['rev-parse', 'HEAD']);
    return { branch, revision };
}

export async function gitCheckout(branchOrRev: string, options: string[] = []) {
    await runGitCommand(['checkout', ...options, branchOrRev]);
}

export async function gitCommit(message: string) {
    await runGitCommand(['add', '.']);
    await runGitCommand(['commit', '-m', message]);
    return await runGitCommand(['rev-parse', 'HEAD']);
}

export async function gitPush() {
    await runGitCommand(['push']);
}

export async function gitPull() {
    await runGitCommand(['pull']);
}

export async function gitFetch() {
    await runGitCommand(['fetch']);
}