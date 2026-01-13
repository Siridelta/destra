import { ExprDSLCSTVisitor } from "../base-visitor";
import { CtxVarExprDefASTNode, CtxVarRangeDefASTNode, CtxVarNullDefASTNode } from "./addSub-level";
import { analyzeRsVarDepType, scanUdRsVarRefs } from "../helpers";
import { traverse } from "../traverse-ast";
import { resolveVarIRs } from "./top-level";
import { RsVarDepType } from "../helpers";
import { nextAstId } from "../..";

declare module '../base-visitor' {
    interface ExprDSLCSTVisitor {
        ctxFactoryExprDefHead(ctx: any): CtxFactoryExprDefHeadASTNode;
        ctxFactoryRangeDefHead(ctx: any): CtxFactoryRangeDefHeadASTNode;
        ctxFactoryNullDefHead(ctx: any): CtxFactoryNullDefHeadASTNode;
    }
}

export type CtxFactoryExprDefHeadASTNode = {
    type: "ctxFactoryHead",
    subtype: "expr",
    ctxVarDefs: CtxVarExprDefASTNode[];
    rsVarDepType: RsVarDepType | null;
    rsVars: string[];
};
export type CtxFactoryRangeDefHeadASTNode = {
    type: "ctxFactoryHead",
    subtype: "range",
    ctxVarDef: CtxVarRangeDefASTNode;
    rsVarDepType: RsVarDepType | null;
    rsVars: string[];
};
export type CtxFactoryNullDefHeadASTNode = {
    type: "ctxFactoryHead",
    subtype: "null",
    ctxVarDefs: CtxVarNullDefASTNode[];
    rsVarDepType: RsVarDepType | null;
    rsVars: string[];
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
    }, true);
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
    traverse(ast, { enter }, true);
}

function checkNoDuplicateCtxVarNames(ctxVarNames: string[]) {
    const uniqueNames = new Set(ctxVarNames);
    if (uniqueNames.size !== ctxVarNames.length) {
        throw new Error("Duplicate context variable names are not allowed.");
    }
}

ExprDSLCSTVisitor.prototype.ctxFactoryExprDefHead = function (ctx: any): CtxFactoryExprDefHeadASTNode {
    const ctxVarNames = this.batchVisit(ctx.ctxVar);
    const values = this.batchVisit(ctx.value);

    checkNoDuplicateCtxVarNames(ctxVarNames);

    // Zipping
    const ctxVarDefs: CtxVarExprDefASTNode[] = ctxVarNames.map((name: string, i: number) => ({
        type: "ctxVarDef",
        name: name,
        subtype: 'expr',
        expr: values[i],
        _astId: nextAstId(),
    }));

    ctxVarDefs.forEach(def => {
        checkNoMaybeFuncDefIR(def.expr);
        ctxHeadResolveVarIRs(def.expr, ctxVarNames);
    });

    const ast: CtxFactoryExprDefHeadASTNode = {
        type: "ctxFactoryHead",
        subtype: "expr",
        ctxVarDefs,
        rsVarDepType: null,
        rsVars: [],
    };

    const { rsVarRefs } = scanUdRsVarRefs(ast, this);
    ast.rsVarDepType = analyzeRsVarDepType(rsVarRefs);
    ast.rsVars = rsVarRefs;
    return ast;
}

ExprDSLCSTVisitor.prototype.ctxFactoryRangeDefHead = function (ctx: any): CtxFactoryRangeDefHeadASTNode {
    const ctxVarName = this.visit(ctx.ctxVar);
    
    const lower = this.visit(ctx.lower[0]);
    const upper = this.visit(ctx.upper[0]);
    
    const ctxVarDef: CtxVarRangeDefASTNode = {
        type: "ctxVarDef",
        name: ctxVarName,
        subtype: 'range',
        lower: lower,
        upper: upper,
        _astId: nextAstId(),
    };

    [lower, upper].forEach(expr => {
        checkNoMaybeFuncDefIR(expr);
        ctxHeadResolveVarIRs(expr, [ctxVarName]);
    });

    const ast: CtxFactoryRangeDefHeadASTNode = {
        type: "ctxFactoryHead",
        subtype: "range",
        ctxVarDef,
        rsVarDepType: null,
        rsVars: [],
    };

    const { rsVarRefs } = scanUdRsVarRefs(ast, this);
    ast.rsVarDepType = analyzeRsVarDepType(rsVarRefs);
    ast.rsVars = rsVarRefs;
    return ast;
}

ExprDSLCSTVisitor.prototype.ctxFactoryNullDefHead = function (ctx: any): CtxFactoryNullDefHeadASTNode {
    const ctxVarNames: string[] = this.batchVisit(ctx.ctxVar); 
    const ctxVarDefs: CtxVarNullDefASTNode[] = ctxVarNames.map(name => ({
        type: "ctxVarDef",
        name: name,
        subtype: 'null',
        _astId: nextAstId(),
    }));

    checkNoDuplicateCtxVarNames(ctxVarNames);

    return {
        type: "ctxFactoryHead",
        subtype: "null",
        ctxVarDefs,
        rsVarDepType: null,
        rsVars: [],
    };
}
