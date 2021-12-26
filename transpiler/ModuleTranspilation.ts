import { CodeWriter } from "./CodeWriter";
import ts from "typescript";
import path from "path";
import { transpileType } from "./TypeTranspilation";
import { TranspilationError } from "./TranspilationError";
import { transpileFunction } from "./FunctionTranspilation";

export function transpileModule(typeChecker: ts.TypeChecker, f: ts.SourceFile) {
    const writer = new CodeWriter();

    writer.appendLine(`namespace PPP.${path.basename(path.dirname(f.fileName))};`);
    writer.appendLine();
    writer.appendLine(`public static class ${path.parse(f.fileName).name}`);
    writer.appendLine("{");
    writer.appendIndented(() => {
        ts.forEachChild(f, visitNode);
    });
    writer.appendLine("}");
    writer.toFile(`${f.fileName}.cs`);

    function visitNode(node: ts.Node) {
        if (ts.isTypeAliasDeclaration(node)) {
            transpileType(typeChecker, writer, node);
        } else if (ts.isFunctionDeclaration(node)) {
            transpileFunction(typeChecker, writer, node);
        } else if (ts.isImportDeclaration(node)) {
            // Nothing to do here. Imports are obviously necessary for the TS tooling to work, but we don't care about it.
        } else if (node.kind == ts.SyntaxKind.EndOfFileToken) {
            // Nothing to do here.
        } else {
            throw new TranspilationError(node, "Unsupported language feature.");
        }
    }
}
