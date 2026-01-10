import { createRegExp, exactly } from "magic-regexp";
import { ctxVarNameExcludePattern, identifierPattern } from "../../../syntax-reference/commonRegExpPatterns";
import { FormulaVisitor } from "../base-visitor";
import { flattenMultLevel, isMultDivType, unflattenMultLevel } from "./multDiv-level";
import { CtxVarNullDefASTNode, CtxVarRangeDefASTNode } from "./addSub-level";


declare module '../base-visitor' {
    interface FormulaVisitor {
        context_type1(ctx: any): any;
        sum(ctx: any): any;
        prod(ctx: any): any;
        int(ctx: any): any;
        diff(ctx: any): any;
    }
}

export type SumClauseASTNode = {
    type: "sumClause",
    ctxVarDef: CtxVarRangeDefASTNode,
    content: any,
}
export type ProdClauseASTNode = {
    type: "prodClause",
    ctxVarDef: CtxVarRangeDefASTNode,
    content: any,
}
export type IntClauseASTNode = {
    type: "intClause",
    ctxVarDef: CtxVarRangeDefASTNode,
    content: any,
}
export type DiffClauseASTNode = {
    type: "diffClause",
    ctxVarDef: CtxVarNullDefASTNode,
    content: any,
}


FormulaVisitor.prototype.context_type1 = function (ctx: any): any {
    const sum = this.visit(ctx.sum);
    const prod = this.visit(ctx.prod);
    const int = this.visit(ctx.int);
    const diff = this.visit(ctx.diff);
    if (sum) {
        return sum;
    }
    if (prod) {
        return prod;
    }
    if (int) {
        return int;
    }
    if (diff) {
        return diff;
    }
    throw new Error("Internal error: context_type1 should not be empty.");
}

FormulaVisitor.prototype.sum = function (ctx: any): SumClauseASTNode {
    const ctxVarName = this.visit(ctx.ctxVar);
    const lower = this.visit(ctx.lower);
    const upper = this.visit(ctx.upper);
    const content = this.visit(ctx.content);
    return {
        type: "sumClause",
        ctxVarDef: {
            type: "ctxVarDef",
            name: ctxVarName,
            subtype: 'range',
            lower: lower,
            upper: upper,
        },
        content: content,
    }
}

FormulaVisitor.prototype.prod = function (ctx: any): ProdClauseASTNode {
    const ctxVarName = this.visit(ctx.ctxVar);
    const lower = this.visit(ctx.lower);
    const upper = this.visit(ctx.upper);
    const content = this.visit(ctx.content);
    return {
        type: "prodClause",
        ctxVarDef: {
            type: "ctxVarDef",
            name: ctxVarName,
            subtype: 'range',
            lower: lower,
            upper: upper,
        },
        content: content,
    }
}

// We need to find 'dx' in the content
const dxPattern = createRegExp(
    exactly("d")
        .notBefore(ctxVarNameExcludePattern),
    identifierPattern.groupedAs("name"),
)
FormulaVisitor.prototype.int = function (ctx: any): IntClauseASTNode {
    const lower = this.visit(ctx.lower);
    const upper = this.visit(ctx.upper);
    const content = this.visit(ctx.content);

    const matchMaybeDx = (node: any): null | string => {
        if (node?.type !== 'varIR') {
            return null;
        }
        const match = node.name.match(dxPattern);
        if (match) {
            return match.groups?.name;
        }
        return null;
    }

    const flattened = flattenMultLevel(content);
    let ctxVarName = null;

    const mkResult = (ctxVarName: string, content: any) => {
        return {
            type: "intClause" as const,
            ctxVarDef: {
                type: "ctxVarDef" as const,
                name: ctxVarName,
                subtype: 'range' as const,
                lower: lower,
                upper: upper,
            },
            content: content,
        }
    }

    // only one node ?! good
    if (flattened.ops.length === 0) {
        ctxVarName = matchMaybeDx(flattened.nodes[0]);
        if (!ctxVarName) {
            throw new Error(
                `Failed to find 'dx'-like syntax in integral clause.`
            );
        }
        return mkResult(ctxVarName, null);
    }

    // Seek leftmost in mult/div chain - imult chain
    if (flattened.ops[0] === 'iMult') {
        ctxVarName = matchMaybeDx(flattened.nodes[0]);
    }
    // shift left
    if (ctxVarName) {
        flattened.nodes.shift();
        flattened.ops.shift();
        return mkResult(ctxVarName, unflattenMultLevel(flattened));
    }


    // Seek rightmost in mult/div chain - imult chain
    if (flattened.ops[flattened.ops.length - 1] === 'iMult') {
        ctxVarName = matchMaybeDx(flattened.nodes[flattened.nodes.length - 1]);
    }
    if (ctxVarName) {
        flattened.nodes.pop();
        flattened.ops.pop();
        return mkResult(ctxVarName, unflattenMultLevel(flattened));
    }

    throw new Error(
        `Failed to find 'dx'-like syntax in integral clause.`
    );
}

FormulaVisitor.prototype.diff = function (ctx: any): DiffClauseASTNode {
    const ctxVarName = this.visit(ctx.ctxVar);
    const content = this.visit(ctx.content);
    return {
        type: "diffClause",
        ctxVarDef: {
            type: "ctxVarDef",
            name: ctxVarName,
            subtype: 'null',
        },
        content: content,
    }
}