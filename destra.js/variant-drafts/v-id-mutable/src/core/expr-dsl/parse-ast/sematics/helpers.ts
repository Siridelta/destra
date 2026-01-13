import { CtxVar, Formula, isFuncExpl, RegrParam, Substitutable } from "../../../formula/base";
import { ASTState, getState } from "../../../state";
import { ExprDSLCSTVisitor } from "./base-visitor";
import { traverse } from "./traverse-ast";
import { CtxVarDefASTNode, ForClauseASTNode, WithClauseASTNode } from "./visitor-parts/addSub-level";
import { ParenExpASTNode, TupleExpASTNode } from "./visitor-parts/atomic-exps";
import { DiffClauseASTNode, IntClauseASTNode, ProdClauseASTNode, SumClauseASTNode } from "./visitor-parts/context-type1";
import { CtxFactoryHeadASTNode } from "./visitor-parts/ctx-header";
import { SubstitutionASTNode, VarIRNode } from "./visitor-parts/terminals";
import { FunctionDefinitionASTNode } from "./visitor-parts/top-level";

export enum ComparisonOperator {
    Greater = ">",
    GreaterEqual = ">=",
    Less = "<",
    LessEqual = "<=",
    Equal = "=",
    Equal2 = "==",
}
export type ComparisonASTNode = {
    type: "comparison",
    operands: any[],
    operators: ComparisonOperator[],
}

export type CtxClauseASTNode =
    | ForClauseASTNode
    | WithClauseASTNode
    | SumClauseASTNode
    | ProdClauseASTNode
    | IntClauseASTNode
    | DiffClauseASTNode;

// func definition top node is also included
export function isCtxClause(node: any): node is CtxClauseASTNode {
    return (
        node?.type === "forClause"
        || node?.type === "withClause"
        || node?.type === "sumClause"
        || node?.type === "prodClause"
        || node?.type === "intClause"
        || node?.type === "diffClause"
    );
}

// func definition top node is also included
export function getCtxNodeCtxVars(ctxNode: CtxClauseASTNode | FunctionDefinitionASTNode): string[] {
    return getCtxNodeVarDefs(ctxNode).map(d => d.name);
}

// func definition top node is also included
export function getCtxNodeVarDefs(ctxNode: CtxClauseASTNode | FunctionDefinitionASTNode): CtxVarDefASTNode[] {
    const varDefs: CtxVarDefASTNode[] = [];
    if (
        ctxNode?.type === 'forClause'
        || ctxNode?.type === 'withClause'
    ) {
        varDefs.push(...ctxNode.ctxVarDefs);
    }
    if (
        ctxNode?.type === 'sumClause'
        || ctxNode?.type === 'prodClause'
        || ctxNode?.type === 'intClause'
        || ctxNode?.type === 'diffClause'
    ) {
        varDefs.push(ctxNode.ctxVarDef);
    }
    if (ctxNode?.type === 'functionDefinition') {
        varDefs.push(...ctxNode.params);
    }
    return varDefs;
}


// --- Undefined & Reserved Variable Scanning & Analyzing ---

// current implementation is not efficient, will always check to bottom without reusing results
function _scanUdRsVarRefs(node: any, obj: ExprDSLCSTVisitor | Formula) {
    const udVarRefs: Set<string> = new Set();
    const rsVarRefs: Set<string> = new Set();
    const enter = (node: any) => {
        if (node?.type === 'undefinedVar') {
            udVarRefs.add(node.name);
        }
        if (node?.type === 'reservedVar') {
            rsVarRefs.add(node.name);
        }
        if (node?.type === 'substitution') {
            const subst = traceSubstitution(node, obj);
            if (subst instanceof Formula && !(subst instanceof CtxVar) && !(subst instanceof RegrParam)) {
                const { rsVars } = traceASTState(subst);
                rsVars.forEach(v => rsVarRefs.add(v));
            }
        }
    }
    traverse(node, { enter }, true);
    return { udVarRefs, rsVarRefs };
}

export function scanUdRsVarRefs(node: any, obj: ExprDSLCSTVisitor | Formula) {
    const { udVarRefs, rsVarRefs } = _scanUdRsVarRefs(node, obj);
    return {
        udVarRefs: Array.from(udVarRefs),
        rsVarRefs: Array.from(rsVarRefs)
    };
}

export function arrayUnion<T>(a: T[], b: T[]): T[] {
    return Array.from(new Set([...a, ...b]));
}

export enum RsVarDepType {
    Cartesian = 'cartesian',           // x, y, z
    Polar = 'polar',                   // r, theta, z
    Spherical = 'spherical',           // rho, theta, phi
    Parametric1D = 'parametric1D',     // t
    Parametric2D = 'parametric2D',     // u, v
}

export function analyzeRsVarDepType(rsVarRefs: string[]): RsVarDepType | null {
    if (rsVarRefs.length === 0) {
        return null;
    }
    if (rsVarRefs.every(v => ['x', 'y', 'z'].includes(v))) {
        return RsVarDepType.Cartesian;
    }
    if (rsVarRefs.every(v => ['r', 'theta', 'z'].includes(v))) {
        return RsVarDepType.Polar;
    }
    if (rsVarRefs.every(v => ['rho', 'theta', 'phi'].includes(v))) {
        return RsVarDepType.Spherical;
    }
    if (rsVarRefs.every(v => ['t'].includes(v))) {
        return RsVarDepType.Parametric1D;
    }
    if (rsVarRefs.every(v => ['u', 'v'].includes(v))) {
        return RsVarDepType.Parametric2D;
    }
    // throw new Error(
    //     `Invalid reserved variables usage: ${rsVarRefs.map(v => `'${v}'`).join(", ")}. `
    //     + `Valid reserved variable sets are:\n`
    //     + `- cartesian: (x, y, z)\n`
    //     + `- polar: (r, theta, z)\n`
    //     + `- spherical: (rho, theta, phi)\n`
    //     + `- parametric1D: (t)\n`
    //     + `- parametric2D: (u, v)`
    // );
    return null;
}


// --- AST Node Type Checking / Predicates ---

export function isTupleExp(node: any): node is TupleExpASTNode {
    return node?.type === "tupleExp";
}

export function isParenExp(node: any): node is ParenExpASTNode {
    return node?.type === "parenExp";
}

export function isVarIR(node: any): node is VarIRNode {
    return node?.type === "varIR";
}


// --- Deep Trace Helpers ---

export function traceSubstitution(ast: SubstitutionASTNode, obj: ExprDSLCSTVisitor | Formula): Substitutable {
    if (obj instanceof ExprDSLCSTVisitor) {
        return obj.values[ast.index];
    }
    if (obj instanceof Formula) {
        return obj.template.values[ast.index];
    }
    throw new Error(`Internal error: Invalid object type ${typeof obj}.`);
}

export function isFuncExplSubst(subst: SubstitutionASTNode, obj: ExprDSLCSTVisitor | Formula): boolean {
    const substValue = traceSubstitution(subst, obj);
    return substValue instanceof Formula && isFuncExpl(substValue);
}

// trace AST
export function traceASTState<T extends Formula>(formula: T):
    T extends CtxVar ? undefined : ASTState {
    return getState(formula).ast as T extends CtxVar ? undefined : ASTState;
}

// trace CtxVar (no AST data in its own state) to its definition AST in its host CtxExp
export function traceCtxVarAST(v: CtxVar): CtxVarDefASTNode {
    const ctxExpHeadAST = getState(getState(v).ctxVar!.sourceCtx!).ast!.root as CtxFactoryHeadASTNode;
    if (ctxExpHeadAST.subtype === "expr") {
        const def = ctxExpHeadAST.ctxVarDefs.find(d => d.name === v.name);
        if (!def) {
            throw new Error(`Internal error: Context variable ${v.name} not found in ctxFactoryExprDefHead.`);
        }
        return def;
    }
    if (ctxExpHeadAST.subtype === "range") {
        const def = ctxExpHeadAST.ctxVarDef;
        if (!def) {
            throw new Error(`Internal error: Context variable ${v.name} not found in ctxFactoryRangeDefHead.`);
        }
        return def;
    }
    if (ctxExpHeadAST.subtype === "null") {
        const def = ctxExpHeadAST.ctxVarDefs.find(d => d.name === v.name);
        if (!def) {
            throw new Error(`Internal error: Context variable ${v.name} not found in ctxFactoryNullDefHead.`);
        }
        return def;
    }
    throw new Error(`Internal error: Context variable ${v.name} not found in ctxFactoryHead.`);
}

