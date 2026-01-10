import { CtxVar, Formula, Substitutable } from "../../../formula/base";
import { getState } from "../../../state";
import { FormulaVisitor } from "./base-visitor";
import { traverse } from "./traverse-ast";
import { ForClauseASTNode, WithClauseASTNode } from "./visitor-parts/addSub-level";
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

export type PointCoordsIRNode = {
    type: "pointCoords",
    coords: any[],
}

export type CtxClauseASTNode =
    | ForClauseASTNode
    | WithClauseASTNode
    | SumClauseASTNode
    | ProdClauseASTNode
    | IntClauseASTNode
    | DiffClauseASTNode
    | FunctionDefinitionASTNode;

// func definition top node is also included
export function isCtxClause(node: any): node is
    | ForClauseASTNode
    | WithClauseASTNode
    | SumClauseASTNode
    | ProdClauseASTNode
    | IntClauseASTNode
    | DiffClauseASTNode
    | FunctionDefinitionASTNode {
    return (
        node?.type === "forClause"
        || node?.type === "withClause"
        || node?.type === "sumClause"
        || node?.type === "prodClause"
        || node?.type === "intClause"
        || node?.type === "diffClause"
        || node?.type === "functionDefinition"
    );
}

// func definition top node is also included
export function getCtxNodeCtxVars(ctxNode: CtxClauseASTNode): string[] {
    const ctxVars: string[] = [];
    if (
        ctxNode?.type === 'forClause'
        || ctxNode?.type === 'withClause'
    ) {
        ctxVars.push(...ctxNode.ctxVarDefs.map(d => d.name));
    }
    if (
        ctxNode?.type === 'sumClause'
        || ctxNode?.type === 'prodClause'
        || ctxNode?.type === 'intClause'
        || ctxNode?.type === 'diffClause'
    ) {
        ctxVars.push(ctxNode.ctxVarDef.name);
    }
    if (ctxNode?.type === 'functionDefinition') {
        ctxVars.push(...ctxNode.params.map(p => p.name));
    }
    return ctxVars;
}

function _scanUdRsVarRefs(node: any) {
    const udVarRefs: Set<string> = new Set();
    const rsVarRefs: Set<string> = new Set();
    const enter = (node: any) => {
        if (node?.type === 'undefinedVar') {
            udVarRefs.add(node.name);
        }
        if (node?.type === 'reservedVar') {
            rsVarRefs.add(node.name);
        }
    }
    traverse(node, { enter }, true);
    return { udVarRefs, rsVarRefs };
}

export function scanUdRsVarRefs(node: any) {
    const { udVarRefs, rsVarRefs } = _scanUdRsVarRefs(node);
    return {
        udVarRefs: Array.from(udVarRefs),
        rsVarRefs: Array.from(rsVarRefs)
    };
}

export function isTupleExp(node: any): node is TupleExpASTNode {
    return node?.type === "tupleExp";
}

export function isParenExp(node: any): node is ParenExpASTNode {
    return node?.type === "parenExp";
}

export function isVarIR(node: any): node is VarIRNode {
    return node?.type === "varIR";
}


export function traceSubstitution(ast: SubstitutionASTNode, obj: FormulaVisitor | Formula): Substitutable {
    if (obj instanceof FormulaVisitor) {
        return obj.values[ast.index];
    }
    if (obj instanceof Formula) {
        return obj.template.values[ast.index];
    }
    throw new Error(`Internal error: Invalid object type ${typeof obj}.`);
}

// trace AST, 
// would also traces CtxVar (no AST data in its state) to its definition AST in its host CtxExp
export function traceAST(formula: Formula): Record<string, any> {
    if (formula instanceof CtxVar) {
        const ctxExpHeadAST = getState(getState(formula).ctxVar!.sourceCtx!).ast!.root as CtxFactoryHeadASTNode;
        if (ctxExpHeadAST.subtype === "expr") {
            const def = ctxExpHeadAST.ctxVarDefs.find(d => d.name === formula.name);
            if (!def) {
                throw new Error(`Internal error: Context variable ${formula.name} not found in ctxFactoryExprDefHead.`);
            }
            return def.expr;
        }
        if (ctxExpHeadAST.subtype === "range") {
            const def = ctxExpHeadAST.ctxVarDef;
            if (!def) {
                throw new Error(`Internal error: Context variable ${formula.name} not found in ctxFactoryRangeDefHead.`);
            }
            return def;
        }
        if (ctxExpHeadAST.subtype === "null") {
            const def = ctxExpHeadAST.ctxVarDefs.find(d => d.name === formula.name);
            if (!def) {
                throw new Error(`Internal error: Context variable ${formula.name} not found in ctxFactoryNullDefHead.`);
            }
            return def;
        }
    }
    return getState(formula).ast!;
}

export { traverse };

