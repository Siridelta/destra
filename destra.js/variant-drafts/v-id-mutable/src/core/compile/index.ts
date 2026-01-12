import { CtxFactoryHeadASTNode, FormulaASTNode } from "../expr-dsl/parse-ast";
import { Formula } from "../formula/base";
import { getState } from "../state";
import { ASTParenAdder } from "./ast-normalize/add-parens";
import { ASTCloner } from "./ast-normalize/clone";
import { ASTExpander } from "./ast-normalize/expand";
import { MultDivArranger } from "./ast-normalize/multDiv-arrange";
import { LatexCompiler } from "./gen-latex";
import { registryAndCollisionCheck } from "./resolve-names/step1_registry";
import { globalRealnameResolution } from "./resolve-names/step2_globalRealname";
import { ctxRealnameResolution } from "./resolve-names/step3_ctxRealname";
import { CompileContext, Graph } from "./types";

export { Folder, Graph, type FolderInput, type GraphInput, type GraphSettings, type Ticker } from "./types";

declare module './types' {
    interface Graph {
        export(): any;
    }
}

declare module '../state' {
    interface CompileState {
        normalizedAST?: FormulaASTNode | CtxFactoryHeadASTNode;
        latex?: string;
    }
}

/**
 * Resolve the graph: perform ID checks, global name resolution, and context variable resolution.
 * This covers Step 1 to Step 3 of the compilation process.
 */
export const resolveGraph = (graph: Graph) => {
    // Step 1: ID Registry & Collision Check
    const ctx = registryAndCollisionCheck(graph);
    
    // Step 2: Global Realname Resolution
    globalRealnameResolution(ctx);
    
    // Step 3: Context Variable Realname Resolution
    ctxRealnameResolution(ctx);
    
    return ctx;
};

Graph.prototype.export = function () {
    const ctx = resolveGraph(this);
    ctx.topoSort.forEach(f => {
        if (f instanceof Formula) {
            compileFormula(f, ctx);
        }
    });
};

function compileFormula(f: Formula, ctx: CompileContext) {
    
    getState(f).compile ??= {};

    const normalizedAST = normalizeAST(f, ctx);

    const latex: string = new LatexCompiler(ctx, f, (f_dep) => {
        return compileFormula(f_dep, ctx);
    }).visit(normalizedAST);

    getState(f).compile!.latex = latex;
    
    return latex;
}

function normalizeAST(f: Formula, ctx: CompileContext, force: boolean = false) {
    
    getState(f).compile ??= {};
    const maybeNormalizedAST = getState(f).compile!.normalizedAST;
    if (!force && maybeNormalizedAST) {
        return maybeNormalizedAST;
    }

    const ast = getState(f).ast!.root;
    const cloned = new ASTCloner().visit(ast);
    const expanded = new ASTExpander().visit(cloned);
    const rearranged = new MultDivArranger(ctx, f).visit(expanded);
    const parened = new ASTParenAdder().visit(rearranged);
    getState(f).compile!.normalizedAST = parened;

    return parened;
}