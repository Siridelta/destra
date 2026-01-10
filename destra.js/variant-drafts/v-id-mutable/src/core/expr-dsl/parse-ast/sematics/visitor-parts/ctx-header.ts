import { FormulaVisitor } from "../base-visitor";
import { CtxVarExprDefASTNode, CtxVarRangeDefASTNode, CtxVarNullDefASTNode } from "./addSub-level";
import { traverse } from "../helpers";
import { resolveVarIRs } from "./top-level";

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

function checkNoMaybeFuncDefIR(ast: any) {
    traverse(ast, {
        enter: (node) => {
            if (node.type === 'maybeFuncDefIR') {
                throw new Error(
                    `Invalid Syntax: 'identifier(...)' is not allowed in context factory head.`
                );
            }
        }
    });
}

// 额外检查不应包含与本 Context 定义的变量同名的未定义变量
function ctxHeadResolveVarIRs(ast: any, ctxVarNames: string[]) {
    // 借用 top-level 的 resolveVarIRs 函数，
    // 会把 VarIR 转换为 udVar, rsVar 或 ctxVar
    resolveVarIRs(ast);

    const enter = (node: any) => {
        if (node.type === 'undefinedVar') {
            if (ctxVarNames.includes(node.name)) {
                throw new Error(
                    `Found dependency on '${node.name}'. Context factory head cannot depend on vars it itself defines.`
                );
            }
        }
    }
    traverse(ast, { enter });
}

function checkNoDuplicateCtxVarNames(ctxVarNames: string[]) {
    const uniqueNames = new Set(ctxVarNames);
    if (uniqueNames.size !== ctxVarNames.length) {
        throw new Error("Duplicate context variable names are not allowed.");
    }
}

FormulaVisitor.prototype.ctxFactoryExprDefHead = function (ctx: any): CtxFactoryExprDefHeadASTNode {
    const ctxVarNames = this.batchVisit(ctx.ctxVar);
    const values = this.batchVisit(ctx.value);

    checkNoDuplicateCtxVarNames(ctxVarNames);

    // Zipping
    const ctxVarDefs: CtxVarExprDefASTNode[] = ctxVarNames.map((name: string, i: number) => ({
        type: "ctxVarDef",
        name: name,
        subtype: 'expr',
        expr: values[i],
    }));

    ctxVarDefs.forEach(def => {
        checkNoMaybeFuncDefIR(def.expr);
        ctxHeadResolveVarIRs(def.expr, ctxVarNames);
    });

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

    [lower, upper].forEach(expr => {
        checkNoMaybeFuncDefIR(expr);
        ctxHeadResolveVarIRs(expr, [ctxVarName]);
    });

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

    checkNoDuplicateCtxVarNames(ctxVarNames);

    return {
        type: "ctxFactoryHead",
        subtype: "null",
        ctxVarDefs,
    };
}
