import { ASTVisitor } from "../../expr-dsl/visit-ast/visitor";
import { Formula } from "../../formula/base";
import { CompileContext } from "../types";

export class LatexCompiler extends ASTVisitor<string, void> {
    public compileContext: CompileContext;
    public targetFormula: Formula;
    public requestDep: (formula: Formula) => string;

    constructor(compileContext: CompileContext, targetFormula: Formula, requestDep: (formula: Formula) => string) {
        super();
        this.compileContext = compileContext;
        this.targetFormula = targetFormula;
        this.requestDep = requestDep;
    }
}