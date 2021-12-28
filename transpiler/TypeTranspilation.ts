import { CodeWriter } from "./CodeWriter";
import sortBy from "lodash/sortBy";
import partition from "lodash/partition";
import ts from "typescript";
import { TranspilationError } from "./TranspilationError";

function generateRecord(
    writer: CodeWriter,
    name: string,
    properties: { name: string; type: () => void; isOptional: boolean }[]
) {
    writer.appendLine(`public readonly record struct ${name}(`);
    writer.appendIndented(() => {
        const [optionalProperties, mandatoryProperties] = partition(
            properties,
            (p) => p.isOptional
        );
        writer.appendSeparated(
            sortBy(mandatoryProperties, (p) => p.name),
            () => writer.appendLine(","),
            (p) => {
                p.type();
                writer.append(` ${p.name}`);
            }
        );
        if (mandatoryProperties.length > 0 && optionalProperties.length > 0) {
            writer.appendLine(",");
        }
        writer.appendSeparated(
            sortBy(optionalProperties, (p) => p.name),
            () => writer.appendLine(","),
            (p) => {
                p.type();
                writer.append(` ${p.name} = null`);
            }
        );
    });
    writer.appendLine(")");
    writer.appendLine("{ }");
    writer.appendLine();
}

function generateEnum(writer: CodeWriter, name: string, literals: string[]) {
    writer.appendLine(`public record class ${name}`);
    writer.appendLine("{");
    writer.appendIndented(() => {
        sortBy(literals).forEach((l) =>
            writer.appendLine(`public static ${name} ${l} = new ("${l}");`)
        );
        writer.appendLine();
        writer.appendLine(`private ${name}(string literal) => _literal = literal;`);
        writer.appendLine();
        writer.appendLine(`private readonly string _literal;`);
        writer.appendLine();
        writer.appendLine(
            `public static bool operator ==(${name} lhs, string rhs) => lhs._literal == rhs;`
        );
        writer.appendLine(
            `public static bool operator ==(string lhs, ${name} rhs) => lhs == rhs._literal;`
        );
        writer.appendLine(
            `public static bool operator !=(${name} lhs, string rhs) => lhs._literal != rhs;`
        );
        writer.appendLine(
            `public static bool operator !=(string lhs, ${name} rhs) => lhs != rhs._literal;`
        );
    });
    writer.appendLine("}");
    writer.appendLine();
}

export function transpileTypeDeclaration(writer: CodeWriter, node: ts.TypeAliasDeclaration) {
    if (ts.isTypeLiteralNode(node.type)) {
        generateRecord(
            writer,
            node.name.text,
            node.type.members.map((m) => {
                if (!ts.isPropertySignature(m)) {
                    throw new TranspilationError(m, "Only properties are supported.");
                }

                if (!ts.isIdentifier(m.name) || m.name.text.includes('"')) {
                    throw new TranspilationError(
                        m.name,
                        "Only unquoted property names are supported."
                    );
                }

                if (!m.type) {
                    throw new TranspilationError(m, "Expected a type reference.");
                }

                if (!m.modifiers?.find((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword)) {
                    throw new TranspilationError(
                        m,
                        "Only immutable types are supported. Add the `readonly` keyword."
                    );
                }

                const isOptional = !!m.questionToken;
                return {
                    name: m.name.text,
                    type: () => transpileTypeReference(writer, m.type!, isOptional),
                    isOptional,
                };
            })
        );
    } else if (ts.isUnionTypeNode(node.type)) {
        generateEnum(
            writer,
            node.name.text,
            node.type.types.map((t) => {
                if (!ts.isLiteralTypeNode(t) || !ts.isStringLiteral(t.literal)) {
                    throw new TranspilationError(
                        t,
                        "Only unions of string literals are supported."
                    );
                }

                return t.literal.text;
            })
        );
    } else {
        throw new TranspilationError(node, "Unsupported type declaration.");
    }
}

export function transpileTypeReference(
    writer: CodeWriter,
    node: ts.TypeNode,
    ensureNullable: boolean = false
) {
    const isNullable = nodeToCSharpType(node);

    if (ts.isTypeReferenceNode(node) && node.typeArguments && node.typeArguments.length > 0) {
        writer.append("<");
        writer.appendSeparated(node.typeArguments, () => writer.append(", "), nodeToCSharpType);
        writer.append(">");
    }

    if (ensureNullable && !isNullable) {
        writer.append("?");
    }

    function nodeToCSharpType(node: ts.TypeNode): boolean {
        if (ts.isUnionTypeNode(node)) {
            const [nullTypes, otherTypes] = partition(
                node.types,
                (t) => ts.isLiteralTypeNode(t) && t.literal.kind === ts.SyntaxKind.NullKeyword
            );
            if (nullTypes.length !== 1 || otherTypes.length !== 1) {
                throw new TranspilationError(
                    node,
                    "Only union types of the form `T | null` are supported."
                );
            }Promise.resolve
            nodeToCSharpType(otherTypes[0]);
            writer.append(`?`);
            return true;
        } else if (ts.isArrayTypeNode(node)) {
            nodeToCSharpType(node.elementType);
            writer.append(`[]`);
        } else if (ts.isParenthesizedTypeNode(node)) {
            nodeToCSharpType(node.type);
        } else if (ts.isTypeReferenceNode(node)) {
            const name = node.typeName.getText();
            switch (name) {
                // Unfortunately, the TypeScript requires `Promise<T>` to be the return type of an async function and we can't use `Task<T>` instead.
                case "Promise":
                    writer.append("Task");
                    break;
                default:
                    writer.append(name);
            }
        } else {
            const name = node.getText();
            switch (name) {
                case "boolean":
                    writer.append("bool");
                    break;
                case "number":
                    throw new TranspilationError(
                        node,
                        "Type `number` is unsupported. Use one of the explicit types `int`, `short`, ..."
                    );
                default:
                    writer.append(name);
            }
        }

        return false;
    }
}
