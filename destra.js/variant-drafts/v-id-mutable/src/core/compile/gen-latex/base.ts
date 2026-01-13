import { expr } from "../../..";
import { CtxClauseASTNode, getCtxNodeCtxVars as getCtxNodeVarNames } from "../../expr-dsl/parse-ast";
import { CtxVarDefASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/addSub-level";
import { CtxFactoryExprDefHeadASTNode, CtxFactoryHeadASTNode, CtxFactoryRangeDefHeadASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/ctx-header";
import { FormulaASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/formula";
import { ASTVisitor } from "../../expr-dsl/visit-ast/visitor";
import { Expl, Formula, isCtxExp } from "../../formula/base";
import { getState } from "../../state";
import { CompileResult } from "../compile";
import { CompileContext } from "../types";
import { l } from "./latex";

export type LatexCompilerVisitContext = {
    ctxScopeStack: CtxVarDefASTNode[][];
}

export class LatexCompiler extends ASTVisitor<string, LatexCompilerVisitContext> {
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
            const f = this.targetFormula;
            const body = this.targetFormula.body;
            const bodyLatex = this.requestDep(
                body instanceof Formula ? body : expr`${body}`
            ).latex;
            let latex = '';
            if (f instanceof Expl) {
                latex += this.getRealname(f)! + '=';
            }
            if (f.ctxKind === 'for' || f.ctxKind === 'with') {
                const varLatex = f.ctxVars.map((cv, i) => {
                    const realname = this.compileContext.ctxVarRealnameMap.get(cv);
                    const valueLatex = this.visit(
                        (nast as CtxFactoryExprDefHeadASTNode).ctxVarDefs[i].expr,
                        newLatexCompilerContext()
                    )
                    return `${realname}=${valueLatex}`;
                }).join(',');
                latex += `${varLatex}${l.opName(f.ctxKind)}${bodyLatex}`;
            } else if (f.ctxKind === 'sum' || f.ctxKind === 'prod' || f.ctxKind === 'int') {
                const cvRealname = this.compileContext.ctxVarRealnameMap.get(f.ctxVars[0]);
                const lowerLatex = this.visit(
                    (nast as CtxFactoryRangeDefHeadASTNode).ctxVarDef.lower,
                    newLatexCompilerContext()
                );
                const upperLatex = this.visit(
                    (nast as CtxFactoryRangeDefHeadASTNode).ctxVarDef.upper,
                    newLatexCompilerContext()
                );
                if (f.ctxKind === 'sum') {
                    latex += `\\sum_{${cvRealname}=${lowerLatex}}^{${upperLatex}}${bodyLatex}`;
                } else if (f.ctxKind === 'prod') {
                    latex += `\\prod_{${cvRealname}=${lowerLatex}}^{${upperLatex}}${bodyLatex}`;
                } else if (f.ctxKind === 'int') {
                    latex += `\\int_{${lowerLatex}}^{${upperLatex}}${bodyLatex}d${cvRealname}`;
                }
            } else if (f.ctxKind === 'diff') {
                const cvRealname = this.compileContext.ctxVarRealnameMap.get(f.ctxVars[0]);
                latex += `\\frac{d}{d${cvRealname}}${bodyLatex}`;
            } else { // ctxKind === 'func'
                const varRealnames = f.ctxVars.map(cv =>
                    this.compileContext.ctxVarRealnameMap.get(cv)
                );
                // reset latex content
                latex = `${this.getRealname(f)!}\\left(${varRealnames.join(',')})\\right)=${bodyLatex}`
            }
            return { latex, slider: null };
        } else {
            return this.formula(nast as FormulaASTNode, newLatexCompilerContext());
        }
    }

    public getRealname(formula?: Formula): string | undefined {
        if (!formula) formula = this.targetFormula;
        return this.compileContext.globalRealnameMap.get(formula);
    }
}

export function matchInternalCtxVarRef(ctxPath: CtxClauseASTNode[], name: string): CtxClauseASTNode | null {
    const _path = [...ctxPath].reverse();
    for (const ctxNode of _path) {
        for (const ctxVarName of getCtxNodeVarNames(ctxNode)) {
            if (ctxVarName === name) {
                return ctxNode;
            }
        }
    }
    return null;
}

export function newLatexCompilerContext() {
    return {
        ctxScopeStack: [],
    }
}