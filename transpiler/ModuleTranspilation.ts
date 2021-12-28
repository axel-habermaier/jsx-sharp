import { CodeWriter } from "./CodeWriter";
import ts from "typescript";
import path from "path";
import { transpileType } from "./TypeTranspilation";
import { TranspilationError } from "./TranspilationError";
import { transpileFunction } from "./FunctionTranspilation";

export function transpileModule(f: ts.SourceFile) {
    const writer = new CodeWriter();

    writer.appendLine(`namespace ${getNamespace(f.fileName)};`);
    transpileImports();
    writer.appendLine();

    writer.appendLine(`public static class ${getModuleName(f.fileName)}`);
    writer.appendLine("{");
    writer.appendIndented(() => {
        ts.forEachChild(f, visitNode);
    });
    writer.appendLine("}");
    writer.toFile(`${f.fileName}.cs`);

    function visitNode(node: ts.Node) {
        if (ts.isTypeAliasDeclaration(node)) {
            transpileType(writer, node);
        } else if (ts.isFunctionDeclaration(node)) {
            transpileFunction(writer, node, false);
        } else if (ts.isImportDeclaration(node)) {
            // Nothing to do here.
        } else if (node.kind == ts.SyntaxKind.EndOfFileToken) {
            // Nothing to do here.
        } else {
            throw new TranspilationError(node, "Unsupported module member.");
        }
    }

    function transpileImports() {
        ts.forEachChild(f, (node) => {
            if (!ts.isImportDeclaration(node)) {
                return;
            }

            if (!node.importClause) {
                throw new TranspilationError(node, "Global imports are unsupported.");
            }
            if (node.importClause.name) {
                throw new TranspilationError(
                    node.importClause.name,
                    "Default imports are unsupported."
                );
            }
            if (!node.importClause.namedBindings) {
                throw new TranspilationError(
                    node.importClause,
                    "Expected a list of named bindings."
                );
            }

            const modulePath = getModuleName(node.moduleSpecifier.getText().replace(/"/g, ""));
            if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                const alias = node.importClause.namedBindings.name.getText();
                writer.appendLine(
                    `using ${alias} = ${getNamespace(modulePath)}.${getModuleName(modulePath)};`
                );
            } else if (ts.isNamedImports(node.importClause.namedBindings)) {
                writer.appendLine(
                    `using static ${getNamespace(modulePath)}.${getModuleName(modulePath)};`
                );
            } else {
                throw new TranspilationError(node, "Unsupported import declaration.");
            }
        });
    }
}

function getNamespace(moduleFilePath: string) {
    return "PPP";
}

function getModuleName(moduleFilePath: string) {
    return path.parse(moduleFilePath).name;
}
