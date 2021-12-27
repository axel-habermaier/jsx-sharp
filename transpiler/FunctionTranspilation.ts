import { CodeWriter } from "./CodeWriter";
import ts from "typescript";
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

function transpileExpression(
    writer: CodeWriter,
    node: ts.Expression,
    jsxMode: "forbidden" | "immediate" | "deferred"
) {
    visitNode(node);

    function visitNode(node: ts.Node) {
        if (ts.isNumericLiteral(node)) {
            writer.append(node.getText());
        } else if (ts.isStringLiteral(node)) {
            writer.append(getStringFromStringLiteral(node));
        } else if (ts.isArrayLiteralExpression(node)) {
            writer.append("new [] {");
            writer.appendSeparated(node.elements, () => writer.append(", "), visitNode);
            writer.append("}");
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
            if (node.operator === ts.SyntaxKind.ExclamationToken) {
                writer.append("JsxHelper.IsTruthy(");
            }
            visitNode(node.operand);
            if (node.operator === ts.SyntaxKind.ExclamationToken) {
                writer.append(")");
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
        } else if (ts.isCallExpression(node)) {
            visitNode(node.expression);
            writer.append("(");
            writer.appendSeparated(node.arguments, () => writer.append(", "), visitNode);
            writer.append(")");
        } else if (ts.isArrowFunction(node)) {
            writer.append("(");
            writer.appendSeparated(node.parameters, () => writer.append(", "), visitNode);
            writer.append(") => ");
            if (node.body.kind === ts.SyntaxKind.Block) {
                transpileStatements(writer, node.body);
            } else {
                transpileExpression(writer, node.body, "deferred");
            }
        } else if (ts.isParameter(node)) {
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
            throw new TranspilationError(node, `Unsupported language feature.`);
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

        // We can immediately render all HTML elements and all <></> fragments, as we
        // statically know exactly where their children have to go in the output.
        // Conversely, we have to defer rendering the children of arbitrary Components,
        // as we don't know when and where they render their children, if at all.
        const isImmediateModeElement = isHtmlElement || tagName === "";

        if (jsxMode === "deferred") {
            writer.appendLine("(JsxElement)(jsx => jsx");
            writer.appendIndented(() => writeJsxElement());
            writer.append(")");
        } else {
            writeJsxElement();
        }

        function writeJsxElement() {
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
                                    transpileExpression(writer, a.value, "forbidden");
                                    writer.append(')}\\"');
                                }
                            }
                        }
                    );
                }
                writer.appendLine('>")');
                writeJsxChildren();
                // TODO: Do we have to special-case self-closing tags?
                writer.appendLine(`.Append("</${tagName}>")`);
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
                                        transpileExpression(writer, a.value, "deferred");
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

            children
                .filter((c) => !ts.isJsxText(c) || !c.containsOnlyTriviaWhiteSpaces)
                .forEach((c) => {
                    if (ts.isJsxText(c)) {
                        writer.appendLine(
                            `.Append("${c
                                .getText()
                                .replace(/\r|\n/g, "")
                                .replace(/\\/g, "\\\\")
                                .replace(/"/g, '\\"')}")`
                        );
                    } else if (ts.isJsxExpression(c)) {
                        if (c.expression) {
                            writer.append(`.Append(`);
                            transpileExpression(writer, c.expression, "immediate");
                            writer.appendLine(`)`);
                        }
                    } else {
                        transpileExpression(writer, c, "immediate");
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
                                    "Unsupported language feature."
                                );
                            }
                        } else {
                            return null;
                        }
                    })(),
                };
            } else if (ts.isJsxSpreadAttribute(p)) {
                // TODO
                throw new TranspilationError(p, "Spread attributes are not yet supported.");
            } else {
                throw new TranspilationError(node, `Unsupported language feature.`);
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
        if (ts.isIfStatement(node)) {
            writer.append("if (");
            writer.append("JsxHelper.IsTruthy(");
            transpileExpression(writer, node.expression, "forbidden");
            writer.append(")");
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
                transpileExpression(writer, node.expression, "deferred");
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
                    transpileExpression(writer, d.initializer, "deferred");
                }
            );
            writer.appendLine(";");
        } else if (ts.isExpressionStatement(node)) {
            transpileExpression(writer, node.expression, "deferred");
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

export function transpileFunction(writer: CodeWriter, node: ts.FunctionDeclaration) {
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
        toCSharpType(node.type),
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

            return { name: p.name.text, type: toCSharpType(p.type) };
        }),
        !!node.modifiers?.find((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    );

    transpileStatements(writer, node.body);
    writer.appendLine();
}
