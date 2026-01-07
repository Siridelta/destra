import { DiffClauseASTNode, ForClauseASTNode, IntClauseASTNode, ProdClauseASTNode, SumClauseASTNode, WithClauseASTNode } from "./addSub-level"
import { PointExpASTNode } from "./atomic-exps";
import { VarIRNode } from "./terminals";
import { FunctionDefinitionASTNode } from "./top-level";

export function traverse(
    ast: any,
    { enter = () => { }, exit = () => { } }:
        { enter?: (ast: any) => any, exit?: (ast: any) => any }
) {
    enter(ast);
    if (Object.getPrototypeOf(ast) !== String.prototype) {
        for (const [k, v] of Object.entries(ast)) {
            if (typeof v === 'object' && v !== null) {
                traverse(v, { enter, exit });
            }
        }
    }
    exit(ast);
    return ast;
}

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
        node.type === "forClause"
        || node.type === "withClause"
        || node.type === "sumClause"
        || node.type === "prodClause"
        || node.type === "intClause"
        || node.type === "diffClause"
        || node.type === "functionDefinition"
    );
}

// func definition top node is also included
export function getCtxNodeCtxVars(ctxNode: CtxClauseASTNode) {
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
    if (node?.type === 'undefinedVar') {
        udVarRefs.add(node.name);
    }
    if (node?.type === 'reservedVar') {
        rsVarRefs.add(node.name);
    }
    for (const [k, v] of Object.entries(node)) {
        if (typeof v === 'object' && v !== null) {
            const { udVarRefs: udVarRefs2, rsVarRefs: rsVarRefs2 } = _scanUdRsVarRefs(v);
            udVarRefs.union(udVarRefs2);
            rsVarRefs.union(rsVarRefs2);
        }
    }
    return { udVarRefs, rsVarRefs };
}

export function scanUdRsVarRefs(node: any) {
    const { udVarRefs, rsVarRefs } = _scanUdRsVarRefs(node);
    return {
        udVarRefs: Array.from(udVarRefs),
        rsVarRefs: Array.from(rsVarRefs)
    };
}

export function isPointExp(node: any): node is PointExpASTNode {
    return node?.type === "pointExp";
}

export function isVarIR(node: any): node is VarIRNode {
    return node?.type === "varIR";
}