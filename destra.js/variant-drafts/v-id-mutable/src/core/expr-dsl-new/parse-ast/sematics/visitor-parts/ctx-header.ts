import { FormulaVisitor } from "../base-visitor";
import { CtxVarExprDefASTNode, CtxVarRangeDefASTNode, CtxVarNullDefASTNode } from "./addSub-level";

declare module '../base-visitor' {
    interface FormulaVisitor {
        ctxFactoryExprDefHead(ctx: any): CtxFactoryExprDefHeadASTNode;
        ctxFactoryRangeDefHead(ctx: any): CtxFactoryRangeDefHeadASTNode;
        ctxFactoryNullDefHead(ctx: any): CtxFactoryNullDefHeadASTNode;
    }
}

export type CtxFactoryExprDefHeadASTNode = {
    type: "ctxFactoryHead",
    subtype: "expr",
    ctxVarDefs: CtxVarExprDefASTNode[];
};
export type CtxFactoryRangeDefHeadASTNode = {
    type: "ctxFactoryHead",
    subtype: "range",
    ctxVarDef: CtxVarRangeDefASTNode;
};
export type CtxFactoryNullDefHeadASTNode = {
    type: "ctxFactoryHead",
    subtype: "null",
    ctxVarDefs: CtxVarNullDefASTNode[];
};
export type CtxFactoryHeadASTNode =
    | CtxFactoryExprDefHeadASTNode 
    | CtxFactoryRangeDefHeadASTNode 
    | CtxFactoryNullDefHeadASTNode;

FormulaVisitor.prototype.ctxFactoryExprDefHead = function (ctx: any): CtxFactoryExprDefHeadASTNode {
    const ctxVarNames = this.batchVisit(ctx.ctxVar);
    const values = this.batchVisit(ctx.value);

    // Zipping
    const ctxVarDefs: CtxVarExprDefASTNode[] = ctxVarNames.map((name: string, i: number) => ({
        type: "ctxVarDef",
        name: name,
        subtype: 'expr',
        expr: values[i],
    }));

    return {
        type: "ctxFactoryHead",
        subtype: "expr",
        ctxVarDefs,
    };
}

FormulaVisitor.prototype.ctxFactoryRangeDefHead = function (ctx: any): CtxFactoryRangeDefHeadASTNode {
    const ctxVarName = this.visit(ctx.ctxVar);
    
    const lower = this.visit(ctx.lower[0]);
    const upper = this.visit(ctx.upper[0]);
    
    const ctxVarDef: CtxVarRangeDefASTNode = {
        type: "ctxVarDef",
        name: ctxVarName,
        subtype: 'range',
        lower: lower,
        upper: upper,
    };

    return {
        type: "ctxFactoryHead",
        subtype: "range",
        ctxVarDef,
    };
}

FormulaVisitor.prototype.ctxFactoryNullDefHead = function (ctx: any): CtxFactoryNullDefHeadASTNode {
    const ctxVarNames: string[] = this.batchVisit(ctx.ctxVar); 
    const ctxVarDefs: CtxVarNullDefASTNode[] = ctxVarNames.map(name => ({
        type: "ctxVarDef",
        name: name,
        subtype: 'null',
    }));

    return {
        type: "ctxFactoryHead",
        subtype: "null",
        ctxVarDefs,
    };
}
