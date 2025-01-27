/**
 * /**
 *  * Extracts React component metadata from the given file content.
 *  * Searches for component declarations with the signature: const ${name}: React.FC<${props}> =
 *  *
 *  * @param fileContent - The content of the file to search for React components.
 *  * @returns An array of objects, each containing the name and props of a React component found in the file.
 *  /\*
 * export async function extractComponentMetadata(fileContent: string): Promise<{ name: string; props: string }[]>;
 */
export async function extractComponentMetadata(fileContent: string): Promise<{ name: string; props: string }[]> {
    const componentRegex = /const (\w+): React\.FC<(\w+)> =/g;
    let match;
    const components: { name: string; props: string }[] = [];
    while ((match = componentRegex.exec(fileContent)) !== null) {
        const [, name, props] = match;
        components.push({ name, props });
    }
    return components;
}