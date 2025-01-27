/**
 * import { parse } from 'npm:@babel/parser';
 * import traverse from 'npm:@babel/traverse';
 * import * as t from 'npm:@babel/types';
 * 
 * export interface TypeDeclaration {
 *   name: string; // The name of the type declaration.
 *   fields: string[]; // The list of fields defined in the type.
 * }
 * 
 * /**
 *  * Parses a string to identify type declarations using the `define.object` function.
 *  * Extracts the `name` and `fields` from each type declaration using AST parsing.
 *  *
 *  * @param code - The input code containing type declarations.
 *  * @returns An array of TypeDeclaration objects, each with a name and fields.
 *  /\*
 * export function parseTypeDeclarationsAST(code: string): TypeDeclaration[];
 */
import { parse } from 'npm:@babel/parser';
import traverse from 'npm:@babel/traverse';
import * as t from 'npm:@babel/types';

export interface TypeDeclaration {
  name: string; // The name of the type declaration.
  fields: string[]; // The list of fields defined in the type.
}

/**
 * Parses a string to identify type declarations using the `define.object` function.
 * Extracts the `name` and `fields` from each type declaration using AST parsing.
 *
 * @param code - The input code containing type declarations.
 * @returns An array of TypeDeclaration objects, each with a name and fields.
 */
export function parseTypeDeclarationsAST(code: string): TypeDeclaration[] {
  const typeDeclarations: TypeDeclaration[] = [];
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  traverse.default(ast, {
    CallExpression(path) {
      const callee = path.get('callee');
      if (
        callee.isMemberExpression() &&
        callee.get('object').isIdentifier({ name: 'define' }) &&
        callee.get('property').isIdentifier({ name: 'object' })
      ) {
        const args = path.get('arguments');
        if (args.length === 1 && args[0].isObjectExpression()) {
          const properties = args[0].get('properties') as t.ObjectProperty[];
          let name = '';
          let fields: string[] = [];

          properties.forEach((prop) => {
            if (t.isObjectProperty(prop.node)) {
              const key = prop.get('key');
              if (key.isIdentifier()) {
                const keyName = key.node.name;
                if (keyName === 'name') {
                  const value = prop.get('value');
                  if (value.isStringLiteral()) {
                    name = value.node.value;
                  }
                } else if (keyName === 'fields') {
                  const value = prop.get('value');
                  if (value.isObjectExpression()) {
                    value.get('properties').forEach((fieldProp) => {
                      if (fieldProp.isObjectProperty()) {
                        const fieldKey = fieldProp.get('key');
                        if (fieldKey.isIdentifier()) {
                          fields.push(fieldKey.node.name);
                        } else if (fieldKey.isStringLiteral()) {
                          fields.push(fieldKey.node.value);
                        }
                      }
                    });
                  }
                }
              }
            }
          });

          if (name) {
            typeDeclarations.push({ name, fields });
          }
        }
      }
    },
  });

  return typeDeclarations;
}
