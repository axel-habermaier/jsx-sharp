import { CodeWriter } from "./CodeWriter";
import ts from "typescript";
import { TranspilationError } from "./TranspilationError";
import { transpileTypeReference } from "./TypeTranspilation";
import { htmlVoidElements } from "./HtmlVoidElements";

function transpileExpression(
    writer: CodeWriter,
    node: ts.Expression,
    jsxMode: "forbidden" | "immediate" | "deferred",
    isJsxChain: boolean
) {
    visitNode(node);

    function visitNode(node: ts.Node) {
        if (ts.isNumericLiteral(node)) {
            writer.append(node.getText());
        } else if (ts.isStringLiteral(node)) {
            writer.append(getStringFromStringLiteral(node));
        } else if (ts.isArrayLiteralExpression(node)) {
            writer.append("{ ");
            writer.appendSeparated(node.elements, () => writer.append(", "), visitNode);
            writer.append(" }");
        } else if (ts.isObjectLiteralExpression(node)) {
            writer.append("new(");
            writer.appendIndented(() => {
                writer.appendSeparated(
                    node.properties,
                    () => writer.append(", "),
                    (p) => {
                        if (ts.isPropertyAssignment(p)) {
                            writer.append(`${p.name.getText()}: `);
                            visitNode(p.initializer);
                        } else if (ts.isShorthandPropertyAssignment(p)) {
                            writer.append(`${p.name.getText()}: ${p.name.getText()}`);
                        } else {
                            throw new TranspilationError(p, "Unsupported object literal member.");
                        }
                    }
                );
            });
            writer.append(")");
        } else if (node.kind === ts.SyntaxKind.NullKeyword) {
            writer.append("null");
        } else if (node.kind === ts.SyntaxKind.TrueKeyword) {
            writer.append("true");
        } else if (node.kind === ts.SyntaxKind.FalseKeyword) {
            writer.append("false");
        } else if (ts.isIdentifier(node)) {
            writer.append(node.getText());
        } else if (ts.isAsExpression(node)) {
            writer.append("(");
            transpileTypeReference(writer, node.type);
            writer.append(")(");
            visitNode(node.expression);
            writer.append(")");
        } else if (ts.isNonNullExpression(node)) {
            visitNode(node.expression);
            writer.append("!");
        } else if (ts.isAwaitExpression(node)) {
            writer.append("await ");
            visitNode(node.expression);
        } else if (ts.isPrefixUnaryExpression(node)) {
            writer.append(unaryOperatorMap[node.operator]);
            if (node.operator === ts.SyntaxKind.ExclamationToken) {
                writer.append("JsxHelper.IsTruthy(");
            }
            visitNode(node.operand);
            if (node.operator === ts.SyntaxKind.ExclamationToken) {
                writer.append(")");
            }
        } else if (ts.isPostfixUnaryExpression(node)) {
            visitNode(node.operand);
            writer.append(unaryOperatorMap[node.operator]);
        } else if (ts.isBinaryExpression(node)) {
            if (
                node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
                node.operatorToken.kind === ts.SyntaxKind.BarBarToken
            ) {
                writer.append("JsxHelper.");
                writer.append(
                    node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ? "And" : "Or"
                );
                writer.append("(");
                transpileExpression(writer, node.left, "deferred", false);
                writer.append(", ");
                transpileExpression(writer, node.right, "deferred", false);
                writer.append(")");
            } else {
                visitNode(node.left);
                if (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
                    writer.append(" == ");
                } else if (node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken) {
                    writer.append(" != ");
                } else {
                    writer.append(` ${node.operatorToken.getText()} `);
                }
                visitNode(node.right);
            }
        } else if (ts.isPropertyAccessExpression(node)) {
            visitNode(node.expression);
            writer.append(node.questionDotToken ? "?." : ".");
            writer.append(node.name.text);
        } else if (ts.isElementAccessExpression(node)) {
            visitNode(node.expression);
            if (node.questionDotToken) {
                writer.append("?");
            }
            writer.append("[");
            visitNode(node.argumentExpression);
            writer.append("]");
        } else if (ts.isNewExpression(node)) {
            writer.append("new ");
            visitNode(node.expression);
            if (node.typeArguments) {
                writer.append("<");
                writer.appendSeparated(
                    node.typeArguments,
                    () => writer.append(", "),
                    (t) => transpileTypeReference(writer, t)
                );
                writer.append(">");
            }
            writer.append("(");
            writer.appendSeparated(node.arguments ?? [], () => writer.append(", "), visitNode);
            writer.append(")");
        } else if (ts.isParenthesizedExpression(node)) {
            writer.append("(");
            ts.forEachChild(node, visitNode);
            writer.append(")");
        } else if (ts.isConditionalExpression(node)) {
            visitNode(node.condition);
            writer.append("?");
            visitNode(node.whenTrue);
            writer.append(":");
            visitNode(node.whenFalse);
        } else if (ts.isCallExpression(node)) {
            visitNode(node.expression);
            writer.append("(");
            writer.appendSeparated(node.arguments, () => writer.append(", "), visitNode);
            writer.append(")");
        } else if (ts.isVariableDeclarationList(node)) {
            transpileVariableDeclarations(writer, node);
        } else if (ts.isTemplateExpression(node)) {
            writer.append('@$"');
            writer.append(escapeText(node.head.text));
            writer.appendSeparated(
                node.templateSpans,
                () => {},
                (s) => {
                    writer.append("{");
                    visitNode(s.expression);
                    writer.append("}");
                    writer.append(escapeText(s.literal.text));
                }
            );
            writer.append('"');
            function escapeText(text: string) {
                return text
                    .replace(/"/g, isJsxChain ? "&quot;" : '""')
                    .replace(/\{/g, "{{")
                    .replace(/\}/g, "}}");
            }
        } else if (ts.isArrowFunction(node)) {
            if (node.modifiers?.find((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) {
                writer.append("async ");
            }
            if (node.type) {
                transpileTypeReference(writer, node.type);
                writer.append(" ");
            }
            writer.append("(");
            writer.appendSeparated(node.parameters, () => writer.append(", "), visitNode);
            writer.append(") => ");
            if (node.body.kind === ts.SyntaxKind.Block) {
                transpileStatements(writer, node.body);
            } else {
                transpileExpression(writer, node.body, "deferred", isJsxChain);
            }
        } else if (ts.isParameter(node)) {
            if (node.type) {
                transpileTypeReference(writer, node.type);
                writer.append(" ");
            }
            writer.append(node.name.getText());
        } else if (ts.isJsxFragment(node)) {
            transpileJsxElement("", null, node.children);
        } else if (ts.isJsxSelfClosingElement(node)) {
            transpileJsxElement(node.tagName.getText(), node.attributes, null);
        } else if (ts.isJsxElement(node)) {
            transpileJsxElement(
                node.openingElement.tagName.getText(),
                node.openingElement.attributes,
                node.children
            );
        } else {
            throw new TranspilationError(node, `Unsupported expression.`);
        }
    }

    function transpileJsxElement(
        tagName: string,
        attributes: ts.JsxAttributes | null,
        children: ts.NodeArray<ts.JsxChild> | null
    ) {
        if (jsxMode === "forbidden") {
            throw new TranspilationError(node, "JSX is not supported at this location.");
        }

        // HTML elements like <div> or <a> are written out to HTML as-is and are
        // identified with a lower-case first letter in the tag name. All other components
        // are expected to have an upper-case first latter.
        const isHtmlElement = tagName && tagName[0] === tagName[0].toLowerCase();
        const isVoidElement = htmlVoidElements.includes(tagName);

        if (jsxMode === "deferred") {
            writer.appendLine("(JsxElement)(jsx => jsx");
            writer.appendIndented(() => writeJsxElement());
            writer.append(")");
        } else {
            writeJsxElement();
        }

        function writeJsxElement() {
            if (!isJsxChain && jsxMode !== "deferred") {
                writer.append("jsx");
            }

            if (isHtmlElement) {
                writer.append(`.Append($"<${tagName}`);
                if (attributes && attributes.properties.length > 0) {
                    // The `className` prop is actually called `class` in HTML
                    const renameAttributes = (name: string) =>
                        name === "className" ? "class" : name;

                    writer.append(" ");
                    writer.appendSeparated(
                        getJsxAttributes(attributes, renameAttributes),
                        () => writer.append(" "),
                        (a) => {
                            writer.append(`${a.name}=`);
                            if (!a.value) {
                                writer.append('\\"true\\"');
                            } else {
                                if (ts.isStringLiteral(a.value)) {
                                    writer.append(
                                        getStringFromStringLiteral(a.value)
                                            .replace(/\\"/g, "&quot;")
                                            .replace(/"/g, '\\"')
                                    );
                                } else {
                                    writer.append('\\"{(');
                                    transpileExpression(writer, a.value, "forbidden", isJsxChain);
                                    writer.append(')}\\"');
                                }
                            }
                        }
                    );
                }
                writer.appendLine('>")');
                writeJsxChildren();
                if (!isVoidElement) {
                    // Void elements are not allowed to contain children and must either only consist
                    // of a start tag (that's the code we emit here) or of a self-closing tag
                    // (optional HTML syntax). Writing an end tag would result in invalid HTML in that case.
                    // https://dev.w3.org/html5/html-author/#void
                    writer.appendLine(`.Append("</${tagName}>")`);
                }
            } else {
                if (!tagName) {
                    writeJsxChildren();
                } else {
                    // If a component has children, we know that its props type must define a `children`
                    // property as otherwise, the type check would fail.
                    const hasProps = attributes && attributes.properties.length > 0;
                    const hasChildren = children && children.length > 0;
                    writer.append(`.Append(${tagName}(`);
                    if (hasProps || hasChildren) {
                        writer.append("new (");
                        if (hasProps) {
                            writer.appendSeparated(
                                getJsxAttributes(attributes, (n) => n),
                                () => writer.append(", "),
                                (a) => {
                                    writer.append(`${a.name}: `);
                                    if (!a.value) {
                                        writer.append("true");
                                    } else {
                                        transpileExpression(writer, a.value, "deferred", true);
                                    }
                                }
                            );
                        }
                        if (hasProps && hasChildren) {
                            writer.append(", ");
                        }
                        if (hasChildren) {
                            writer.appendLine("children: (JsxElement)(jsx => jsx");
                            writer.appendIndented(() => {
                                writeJsxChildren();
                            });
                            writer.append(")");
                        }
                        writer.append(")");
                    }
                    writer.appendLine("))");
                }
            }
        }

        function writeJsxChildren() {
            if (!children) {
                return;
            }

            if (isVoidElement && children) {
                throw new TranspilationError(
                    node,
                    "HTML void elements are not allowed to contain children."
                );
            }

            children.forEach((c) => {
                if (ts.isJsxText(c)) {
                    writer.appendLine(
                        `.Append("${c
                            .getFullText()
                            .replace(/\s\s+/g, " ")
                            .replace(/\\/g, "\\\\")
                            .replace(/"/g, '\\"')}")`
                    );
                } else if (ts.isJsxExpression(c)) {
                    if (c.expression) {
                        writer.append(`.Append(`);
                        writer.appendIndented(() => {
                            transpileExpression(writer, c.expression!, "immediate", false);
                        });
                        writer.appendLine(`)`);
                    }
                } else {
                    transpileExpression(writer, c, "immediate", true);
                }
            });
        }
    }

    function getJsxAttributes(
        attributes: ts.JsxAttributes,
        renameAttributes: (name: string) => string
    ): { name: string; value: ts.Expression | ts.StringLiteral | null }[] {
        return attributes.properties.map((p) => {
            if (ts.isJsxAttribute(p)) {
                return {
                    name: renameAttributes(p.name.text),
                    value: (() => {
                        if (p.initializer) {
                            if (ts.isJsxExpression(p.initializer)) {
                                if (!p.initializer.expression) {
                                    throw new TranspilationError(
                                        p.initializer,
                                        "Expected an expression"
                                    );
                                }
                                return p.initializer.expression;
                            } else if (ts.isStringLiteral(p.initializer)) {
                                return p.initializer;
                            } else {
                                throw new TranspilationError(
                                    p.initializer,
                                    "Unsupported JSX attribute."
                                );
                            }
                        } else {
                            return null;
                        }
                    })(),
                };
            } else if (ts.isJsxSpreadAttribute(p)) {
                throw new TranspilationError(p, "Spread attributes are not yet supported.");
            } else {
                throw new TranspilationError(node, `Unsupported JSX atrribute.`);
            }
        });
    }

    function getStringFromStringLiteral(node: ts.StringLiteral) {
        const text = node.getText();
        return text.startsWith("'")
            ? `"${text.slice(1, text.length - 1).replace(/"/g, '\\"')}"`
            : text;
    }
}

function transpileStatements(writer: CodeWriter, node: ts.Node) {
    visitNode(node);

    function visitNode(node: ts.Node) {
        writeLine(node);
        if (ts.isIfStatement(node)) {
            writer.append("if (");
            writer.append("JsxHelper.IsTruthy(");
            transpileExpression(writer, node.expression, "forbidden", false);
            writer.append(")");
            writer.append(") ");
            visitNode(node.thenStatement);
            if (node.elseStatement) {
                writer.append("else ");
                visitNode(node.elseStatement);
            }
            writer.appendLine();
        } else if (ts.isForStatement(node)) {
            writer.append("for (");
            if (node.initializer) {
                if (ts.isVariableDeclarationList(node.initializer)) {
                    transpileVariableDeclarations(writer, node.initializer);
                } else {
                    transpileExpression(writer, node.initializer, "deferred", false);
                }
            }
            writer.append("; ");
            if (node.condition) {
                transpileExpression(writer, node.condition, "deferred", false);
            }
            writer.append("; ");
            if (node.incrementor) {
                transpileExpression(writer, node.incrementor, "deferred", false);
            }
            writer.append(")");
            visitNode(node.statement);
        } else if (ts.isReturnStatement(node)) {
            writer.append("return");
            if (node.expression) {
                writer.append(" ");
                transpileExpression(writer, node.expression, "deferred", false);
            }
            writer.appendLine(";");
        } else if (ts.isVariableStatement(node)) {
            transpileVariableDeclarations(writer, node.declarationList);
            writer.appendLine(";");
        } else if (ts.isExpressionStatement(node)) {
            transpileExpression(writer, node.expression, "deferred", false);
            writer.appendLine(";");
        } else if (ts.isBlock(node)) {
            writer.appendLine("{");
            writer.appendIndented(() => ts.forEachChild(node, visitNode));
            writer.append("}");
        } else if (ts.isFunctionDeclaration(node)) {
            transpileFunction(writer, node, true);
        } else {
            throw new TranspilationError(node, `Unsupported statement.`);
        }
    }

    function writeLine(node: ts.Node) {
        const file = node.getSourceFile();
        const position = node.getStart(file, true);
        const line = file.getLineAndCharacterOfPosition(position).line + 1;
        writer.appendLine();
        writer.appendLine(`#line ${line} "${file.fileName}"`);
    }
}

function transpileVariableDeclarations(writer: CodeWriter, node: ts.VariableDeclarationList) {
    if (node.declarations.length > 1) {
        throw new TranspilationError(
            node,
            "Multiple declarations are unsupported; split this into separate variable statements."
        );
    }

    const declaration = node.declarations[0];
    writer.append(`${declaration.type?.getText() ?? "var"} `);
    if (!ts.isIdentifier(declaration.name)) {
        throw new TranspilationError(
            declaration.name,
            "Expected an identifier. Deconstruction expressions are unsupported."
        );
    }

    if (!declaration.initializer) {
        throw new TranspilationError(declaration.name, "Variable must be initialized.");
    }

    writer.append(`${declaration.name.getText()} = `);
    transpileExpression(writer, declaration.initializer, "deferred", false);
}

export function transpileFunction(
    writer: CodeWriter,
    node: ts.FunctionDeclaration,
    isLocal: boolean
) {
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
        () => {
            transpileTypeReference(writer, node.type!);
        },
        node.parameters.map((p) => {
            if (!ts.isIdentifier(p.name)) {
                throw new TranspilationError(p, "Argument destructuring is unsupported.");
            }

            if (!p.type) {
                throw new TranspilationError(
                    p,
                    "Parameter must be explicitly annotated with a type."
                );
            }

            return { name: p.name.text, type: () => transpileTypeReference(writer, p.type!) };
        }),
        isLocal
            ? "local"
            : !!node.modifiers?.find((m) => m.kind === ts.SyntaxKind.ExportKeyword)
            ? "public"
            : "private",
        !!node.modifiers?.find((m) => m.kind === ts.SyntaxKind.AsyncKeyword)
    );

    transpileStatements(writer, node.body);
    writer.appendLine();
    writer.appendLine();
}

function generateFunctionSignature(
    writer: CodeWriter,
    name: string,
    returnType: () => void,
    parameters: { name: string; type: () => void }[],
    visibility: "local" | "public" | "private",
    isAsync: boolean
) {
    writer.append(visibility !== "local" ? `${visibility} static ` : "");
    if (isAsync) {
        writer.append("async ");
    }
    returnType();
    writer.append(` ${name}(`);
    writer.appendSeparated(
        parameters,
        () => writer.append(", "),
        (p) => {
            p.type();
            writer.append(` ${p.name}`);
        }
    );
    writer.appendLine(")");
}

const unaryOperatorMap: Record<ts.PrefixUnaryOperator | ts.PostfixUnaryOperator, string> = {
    [ts.SyntaxKind.PlusPlusToken]: "++",
    [ts.SyntaxKind.MinusMinusToken]: "--",
    [ts.SyntaxKind.PlusToken]: "+",
    [ts.SyntaxKind.MinusToken]: "-",
    [ts.SyntaxKind.TildeToken]: "~",
    [ts.SyntaxKind.ExclamationToken]: "!",
} as const;
