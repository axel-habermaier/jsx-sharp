import ts from "typescript";

export class TranspilationError extends Error {
    constructor(public node: ts.Node, message: string) {
        super(message);
    }
}
