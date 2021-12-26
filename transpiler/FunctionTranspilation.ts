import { CodeWriter } from "./CodeWriter";
import ts, { visitNode } from "typescript";
import { TranspilationError } from "./TranspilationError";
import { toCSharpType } from "./TypeTranspilation";

function generateFunctionSignature(
    writer: CodeWriter,
    name: string,
    returnType: string,
    parameters: { name: string; type: string }[],
    isPublic: boolean
) {
    writer.append(isPublic ? "public" : "private");
    writer.append(` static ${returnType} ${name}(`);
    writer.appendSeparated(
        parameters,
        () => writer.append(", "),
        (p) => writer.append(`${p.type} ${p.name}`)
    );
    writer.appendLine(")");
}

function transpileExpression(typeChecker: ts.TypeChecker, writer: CodeWriter, node: ts.Expression) {
    visitNode(node);

    function visitNode(node: ts.Node) {
        if (ts.isNumericLiteral(node)) {
            writer.append(node.getText());
        } else if (ts.isStringLiteral(node)) {
            writer.append(node.getText());
        } else if (node.kind === ts.SyntaxKind.NullKeyword) {
            writer.append("null");
        } else if (node.kind === ts.SyntaxKind.TrueKeyword) {
            writer.append("true");
        } else if (node.kind === ts.SyntaxKind.FalseKeyword) {
            writer.append("false");
        } else if (ts.isIdentifier(node)) {
            writer.append(node.getText());
        } else if (ts.isPrefixUnaryExpression(node)) {
            switch (node.operator) {
                case ts.SyntaxKind.PlusPlusToken:
                    writer.append("++");
                    break;
                case ts.SyntaxKind.MinusMinusToken:
                    writer.append("--");
                    break;
                case ts.SyntaxKind.PlusToken:
                    writer.append("+");
                    break;
                case ts.SyntaxKind.MinusToken:
                    writer.append("-");
                    break;
                case ts.SyntaxKind.TildeToken:
                    writer.append("~");
                    break;
                case ts.SyntaxKind.ExclamationToken:
                    writer.append("!");
                    break;
                default:
                    throw new TranspilationError(node.operator, "Unsupported operator.");
            }
            const operandType = typeChecker.getTypeAtLocation(node.operand);
            if (
                node.operator === ts.SyntaxKind.ExclamationToken &&
                (operandType.flags & ts.TypeFlags.Boolean) === 0 &&
                (operandType.flags & ts.TypeFlags.BooleanLiteral) === 0
            ) {
                writer.append("JsxHelper.IsTruthy(");
                visitNode(node.operand);
                writer.append(")");
            } else {
                visitNode(node.operand);
            }
        } else if (ts.isPostfixUnaryExpression(node)) {
            visitNode(node.operand);
            switch (node.operator) {
                case ts.SyntaxKind.PlusPlusToken:
                    writer.append("++");
                    break;
                case ts.SyntaxKind.MinusMinusToken:
                    writer.append("--");
                    break;
                default:
                    throw new TranspilationError(node.operator, "Unsupported operator.");
            }
        } else if (ts.isBinaryExpression(node)) {
            visitNode(node.left);
            if (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
                writer.append(" == ");
            } else if (node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken) {
                writer.append(" != ");
            } else {
                writer.append(` ${node.operatorToken.getText()} `);
            }
            visitNode(node.right);
        } else if (ts.isPropertyAccessExpression(node)) {
            visitNode(node.expression);
            writer.append(node.questionDotToken ? "?." : ".");
            writer.append(node.name.text);
        } else if (ts.isParenthesizedExpression(node)) {
            writer.append("(");
            ts.forEachChild(node, visitNode);
            writer.append(")");
        } else if (ts.isJsxFragment(node)) {
        } else if (ts.isJsxElement(node)) {
        } else {
            throw new TranspilationError(node, `Unsupported language feature.`);
        }
    }
}

function transpileStatements(typeChecker: ts.TypeChecker, writer: CodeWriter, node: ts.Node) {
    visitNode(node);

    function visitNode(node: ts.Node) {
        if (ts.isIfStatement(node)) {
            writer.append("if (");
            const expressionType = typeChecker.getTypeAtLocation(node.expression);
            const isNonBooleanExpression =
                (expressionType.flags & ts.TypeFlags.Boolean) === 0 &&
                (expressionType.flags & ts.TypeFlags.BooleanLiteral) === 0;
            if (isNonBooleanExpression) {
                writer.append("JsxHelper.IsTruthy(");
            }
            transpileExpression(typeChecker, writer, node.expression);
            if (isNonBooleanExpression) {
                writer.append(")");
            }
            writer.append(") ");
            visitNode(node.thenStatement);
            if (node.elseStatement) {
                writer.append("else ");
                visitNode(node.elseStatement);
            }
        } else if (ts.isReturnStatement(node)) {
            writer.append("return");
            if (node.expression) {
                writer.append(" ");
                transpileExpression(typeChecker, writer, node.expression);
            }
            writer.appendLine(";");
        } else if (ts.isVariableStatement(node)) {
            if (node.declarationList.declarations.length > 1) {
                throw new TranspilationError(
                    node,
                    "Multiple declarations are unsupported; split this into separate variable statements."
                );
            }

            writer.append("var ");
            writer.appendSeparated(
                node.declarationList.declarations,
                () => writer.append(", "),
                (d) => {
                    if (!ts.isIdentifier(d.name)) {
                        throw new TranspilationError(
                            d.name,
                            "Expected an identifier. Deconstruction expressions are unsupported."
                        );
                    }

                    if (!d.initializer) {
                        throw new TranspilationError(d.name, "Variable must be initialized.");
                    }

                    writer.append(`${d.name.getText()} = `);
                    transpileExpression(typeChecker, writer, d.initializer);
                }
            );
            writer.appendLine(";");
        } else if (ts.isExpressionStatement(node)) {
            transpileExpression(typeChecker, writer, node.expression);
            writer.appendLine(";");
        } else if (ts.isBlock(node)) {
            writer.appendLine("{");
            writer.appendIndented(() => ts.forEachChild(node, visitNode));
            writer.appendLine("}");
        } else {
            throw new TranspilationError(node, `Unsupported language feature.`);
        }
    }
}

export function transpileFunction(typeChecker: ts.TypeChecker, writer: CodeWriter, node: ts.FunctionDeclaration) {
    if (!node.name) {
        throw new TranspilationError(node, "Functions must be named.");
    }

    if (!node.type) {
        throw new TranspilationError(node, "Function return type must be explicitly annotated.");
    }

    if (!node.body) {
        throw new TranspilationError(node, "Function must have a body.");
    }

    generateFunctionSignature(
        writer,
        node.name.text,
        toCSharpType(typeChecker, node.type),
        node.parameters.map((p) => {
            if (!ts.isIdentifier(p.name)) {
                throw new TranspilationError(p, "Argument destructuring is unsupported.");
            }

            if (!p.type) {
                throw new TranspilationError(p, "Parameter must be explicitly annotated with a type.");
            }

            return { name: p.name.text, type: toCSharpType(typeChecker, p.type) };
        }),
        !!node.modifiers?.find((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    );

    transpileStatements(typeChecker, writer, node.body);
    writer.appendLine();
}
