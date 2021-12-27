import ts, { DiagnosticCategory } from "typescript";
import { TranspilationError } from "./TranspilationError";
import { transpileModule } from "./ModuleTranspilation";

function watchMain() {
    const configPath = ts.findConfigFile("./", ts.sys.fileExists, "tsconfig.json");
    if (!configPath) {
        throw new Error("Could not find a valid 'tsconfig.json'.");
    }

    const createProgram = ts.createSemanticDiagnosticsBuilderProgram;
    const host = ts.createWatchCompilerHost(configPath, {}, ts.sys, createProgram, reportDiagnostic, reportDiagnostic);

    const originalAfterProgramCreate = host.afterProgramCreate;
    host.afterProgramCreate = (programBuilder) => {
        originalAfterProgramCreate?.(programBuilder);

        // TODO: Can we somehow get only the files that have actually changed?
        programBuilder
            .getSourceFiles()
            .filter((f) => f.fileName.endsWith(".tsx"))
            .map((f) => {
                const start = performance.now();
                try {
                    transpileModule(f);
                } catch (e: unknown) {
                    if (e instanceof TranspilationError) {
                        reportDiagnostic({
                            category: DiagnosticCategory.Error,
                            file: f,
                            length: e.node.getFullText().length,
                            start: e.node.getStart(),
                            messageText: e.message,
                            code: 7777,
                        });
                    }
                } finally {
                    console.log(`Transpiled ${f.fileName} in ${performance.now() - start} ms.`);
                }
            });
    };

    ts.createWatchProgram(host);
}

function reportDiagnostic(diagnostic: ts.Diagnostic) {
    console.error(
        ts.formatDiagnosticsWithColorAndContext([diagnostic], {
            getCanonicalFileName: (path) => path,
            getCurrentDirectory: ts.sys.getCurrentDirectory,
            getNewLine: () => ts.sys.newLine,
        })
    );
}

watchMain();
