import { CompileResult } from "..";
import { CtxFactoryHeadASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/ctx-header";
import { FormulaASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/formula";
import { ASTVisitor } from "../../expr-dsl/visit-ast/visitor";
import { Formula, isCtxExp } from "../../formula/base";
import { getState } from "../../state";
import { CompileContext } from "../types";

export class LatexCompiler extends ASTVisitor<string, void> {
    public compileContext: CompileContext;
    public targetFormula: Formula;
    public requestDep: (formula: Formula) => CompileResult;
    public requestNormalizedAST: (formula: Formula) => FormulaASTNode | CtxFactoryHeadASTNode;

    constructor(
        compileContext: CompileContext, 
        targetFormula: Formula, 
        requestDep: (formula: Formula) => CompileResult,
        requestNormalizedAST: (formula: Formula) => FormulaASTNode | CtxFactoryHeadASTNode
    ) {
        super();
        this.compileContext = compileContext;
        this.targetFormula = targetFormula;
        this.requestDep = requestDep;
        this.requestNormalizedAST = requestNormalizedAST;
    }

    public compile(): CompileResult {
        getState(this.targetFormula).compile ??= {};
        let nast = getState(this.targetFormula).compile!.normalizedAST;
        if (!nast) 
            nast = this.requestNormalizedAST(this.targetFormula);

        if (isCtxExp(this.targetFormula)) {
            // const bodyNast = this.requestNormalizedAST(this.targetFormula.body);
            // return this.CtxExp();
        } else {
            return this.formula(nast as FormulaASTNode);
        }
    }

    public getRealname(formula?: Formula): string | undefined {
        if (!formula) formula = this.targetFormula;
        return this.compileContext.globalRealnameMap.get(formula);
    }
}