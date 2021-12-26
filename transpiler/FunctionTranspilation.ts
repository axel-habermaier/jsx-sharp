import { CodeWriter } from "./CodeWriter";
import ts, { visitNode } from "typescript";
import { TranspilationError } from "./TranspilationError";
import { toCSharpType } from "./TypeTranspilation";
import React from "react";

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

function generateJsxElement(
    writer: CodeWriter,
    tagName: string,
    props: { name: string; value: () => void }[],
    children: (() => void)[]
) {
    // Built-in components like <div> or <a> are written out to HTML as-is and are
    // identified with a lower-case first letter in the tag name. All other components
    // are expected to have an upper-case first latter.
    const isBuiltInComponent = tagName[0] === tagName[0].toLowerCase();
    if (isBuiltInComponent) {
        generateJsxElementForBuiltIn(writer, tagName, props, children);
    } else {
        generateJsxElementForComponent(writer, tagName, props, children);
    }
}

function generateJsxElementForBuiltIn(
    writer: CodeWriter,
    tagName: string,
    props: { name: string; value: () => void }[],
    children: (() => void)[]
) {
    writer.appendLine(`JsxElement.CreateHtmlElement(`);
    writer.appendIndented(() => {
        writer.appendLine(`"${tagName}",`);
        writer.append("new (");
        if (props.length > 0) {
            writer.append("attributes: new () {");
            writer.appendSeparated(
                props,
                () => writer.append(", "),
                (p) => {
                    // The `className` prop is actually called `class` in HTML.
                    const name = p.name === "className" ? "class" : p.name;
                    writer.append(`("${name}", `);
                    p.value();
                    writer.append(")");
                }
            );
            writer.append("}");
        }
        if (props.length > 0 && children.length > 0) {
            writer.append(", ");
        }
        if (children.length > 0) {
            writer.append("children: ");
            generateJsxChildren(writer, children);
        }
        writer.append(")");
    });
    writer.append(")");
}

function generateJsxElementForComponent(
    writer: CodeWriter,
    tagName: string,
    props: { name: string; value: () => void }[],
    children: (() => void)[]
) {
    // If a non-built-in component has children, we know that the component must define a `children`
    // prop as otherwise, the type check would fail.
    const propsWithChildren =
        children.length === 0
            ? props
            : [
                  ...props,
                  {
                      name: "children",
                      value: () => generateJsxChildren(writer, children),
                  },
              ];

    writer.appendLine(`JsxElement.Create<${tagName}Props>(`);
    writer.appendIndented(() => {
        writer.appendLine(`${tagName},`);
        if (propsWithChildren.length === 0) {
            writer.append("null");
        } else {
            writer.append("new (");

            writer.appendSeparated(
                propsWithChildren,
                () => writer.append(", "),
                (p) => {
                    writer.append(`${p.name}: `);
                    p.value();
                }
            );
            writer.append(")");
        }
    });
    writer.append(")");
}

function generateJsxChildren(writer: CodeWriter, children: (() => void)[]) {
    if (children.length === 1) {
        children[0]();
    } else {
        writer.appendLine("JsxElement.Create(");
        writer.appendIndented(() => {
            writer.appendSeparated(
                children,
                () => writer.appendLine(", "),
                (c) => c()
            );
        });
        writer.append(")");
    }
}

function transpileExpression(typeChecker: ts.TypeChecker, writer: CodeWriter, node: ts.Expression) {
    visitNode(node);

    function visitNode(node: ts.Node) {
        if (ts.isNumericLiteral(node)) {
            writer.append(node.getText());
        } else if (ts.isStringLiteral(node)) {
            const text = node.getText();
            if (text.startsWith("'")) {
                writer.append(`"${text.slice(1, text.length - 1).replace(/"/, '\\"')}"`);
            } else {
                writer.append(text);
            }
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
            generateJsxElement(writer, "JsxElement.Fragment", [], getJsxChildren(node.children));
        } else if (ts.isJsxSelfClosingElement(node)) {
            generateJsxElement(writer, node.tagName.getText(), getJsxAttributes(node.attributes), []);
        } else if (ts.isJsxElement(node)) {
            generateJsxElement(
                writer,
                node.openingElement.tagName.getText(),
                getJsxAttributes(node.openingElement.attributes),
                getJsxChildren(node.children)
            );
        } else if (ts.isJsxExpression(node)) {
            if (node.expression) {
                writer.append("JsxElement.Create(");
                visitNode(node.expression);
                writer.append(")");
            } else {
                writer.append("null");
            }
        } else if (ts.isJsxText(node)) {
            writer.append(`JsxElement.Create("${node.getText().replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`);
        } else {
            throw new TranspilationError(node, `Unsupported language feature.`);
        }
    }

    function getJsxAttributes(attributes: ts.JsxAttributes) {
        return attributes.properties.map((p) => {
            if (ts.isJsxAttribute(p)) {
                return {
                    name: p.name.text,
                    value: () => {
                        if (p.initializer) {
                            if (ts.isJsxExpression(p.initializer)) {
                                if (!p.initializer.expression) {
                                    throw new TranspilationError(p.initializer, "Expected an expression");
                                }
                                return visitNode(p.initializer.expression);
                            } else if (ts.isStringLiteral(p.initializer)) {
                                visitNode(p.initializer);
                            } else {
                                throw new TranspilationError(p.initializer, "Unsupported language feature.");
                            }
                        } else {
                            writer.append("true");
                        }
                    },
                };
            } else if (ts.isJsxSpreadAttribute(p)) {
                // TODO
                throw new TranspilationError(p, "Spread attributes are not yet supported.");
            } else {
                throw new TranspilationError(node, `Unsupported language feature.`);
            }
        });
    }

    function getJsxChildren(children: ts.NodeArray<ts.JsxChild>) {
        return !children || children.length === 0
            ? []
            : children
                  .filter((c) => !ts.isJsxText(c) || !c.containsOnlyTriviaWhiteSpaces)
                  .map((c) => () => visitNode(c));
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
