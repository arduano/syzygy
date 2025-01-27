/**
 * export interface TypeDeclaration {
 *   name: string; // The name of the type declaration.
 *   fields: string[]; // The list of fields defined in the type.
 * }
 * 
 * /**
 *  * Parses a string to identify type declarations using the `define.object` function.
 *  * Extracts the `name` and `fields` from each type declaration.
 *  * 
 *  * @param text - The input text containing type declarations.
 *  * @returns An array of TypeDeclaration objects, each with a name and fields.
 *  /\*
 * export function parseTypeDeclarations(text: string): TypeDeclaration[];
 * 
 */
export interface TypeDeclaration {
  name: string;
  fields: string[];
}

/**
 * Parses a string to identify type declarations using the `define.object` function.
 * Extracts the `name` and `fields` from each type declaration.
 * 
 * @param text - The input text containing type declarations.
 * @returns An array of TypeDeclaration objects, each with a name and fields.
 */
export function parseTypeDeclarations(text: string): TypeDeclaration[] {
  const typeDeclarations: TypeDeclaration[] = [];

  const defineObjectRegex = /define\.object\(\{([\s\S]*?)\}\)/g;
  const nameRegex = /name:\s*['"]([^'"]+)['"]/;
  const fieldsRegex = /fields:\s*\{([\s\S]*?)\}/;
  const fieldNamesRegex = /([\w]+):/g;

  let match;
  while ((match = defineObjectRegex.exec(text)) !== null) {
    const objectContent = match[1];

    const nameMatch = nameRegex.exec(objectContent);
    const fieldsMatch = fieldsRegex.exec(objectContent);

    if (nameMatch && fieldsMatch) {
      const name = nameMatch[1];
      const fieldsContent = fieldsMatch[1];

      const fields = [];
      let fieldMatch;
      while ((fieldMatch = fieldNamesRegex.exec(fieldsContent)) !== null) {
        fields.push(fieldMatch[1]);
      }

      typeDeclarations.push({ name, fields });
    }
  }

  return typeDeclarations;
}
