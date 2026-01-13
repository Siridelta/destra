import { createRegExp, exactly } from "magic-regexp";
import { ctxVarNameExcludePattern, identifierPattern } from "../../../syntax-reference/commonRegExpPatterns";
import { ExprDSLCSTVisitor } from "../base-visitor";
import { flattenMultLevel, unflattenMultLevel } from "./multDiv-level";
import { CtxVarNullDefASTNode, CtxVarRangeDefASTNode } from "./addSub-level";
import { analyzeRsVarDepType, arrayUnion, RsVarDepType, scanUdRsVarRefs } from "../helpers";
import { nextAstId } from "../..";


declare module '../base-visitor' {
    interface ExprDSLCSTVisitor {
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
    rsVarDepType: RsVarDepType | null,
    rsVars: string[],
    forbiddenNames: string[],
}
export type ProdClauseASTNode = {
    type: "prodClause",
    ctxVarDef: CtxVarRangeDefASTNode,
    content: any,
    rsVarDepType: RsVarDepType | null,
    rsVars: string[],
    forbiddenNames: string[],
}
export type IntClauseASTNode = {
    type: "intClause",
    ctxVarDef: CtxVarRangeDefASTNode,
    content: any,
    rsVarDepType: RsVarDepType | null,
    rsVars: string[],
    forbiddenNames: string[],
}
export type DiffClauseASTNode = {
    type: "diffClause",
    ctxVarDef: CtxVarNullDefASTNode,
    content: any,
    rsVarDepType: RsVarDepType | null,
    rsVars: string[],
    forbiddenNames: string[],
}

export type ContextType1ASTNode =
    | SumClauseASTNode
    | ProdClauseASTNode
    | IntClauseASTNode
    | DiffClauseASTNode;

export function isContextType1ASTNode(node: any): node is ContextType1ASTNode {
    return (
        node?.type === "sumClause"
        || node?.type === "prodClause"
        || node?.type === "intClause"
        || node?.type === "diffClause"
    );
}

ExprDSLCSTVisitor.prototype.context_type1 = function (ctx: any): any {
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

ExprDSLCSTVisitor.prototype.sum = function (ctx: any): SumClauseASTNode {
    const ctxVarName = this.visit(ctx.ctxVar);
    const lower = this.visit(ctx.lower);
    const upper = this.visit(ctx.upper);
    const content = this.visit(ctx.content);
    
    const rsVarsFromBody = scanUdRsVarRefs(content, this).rsVarRefs;
    const rsVarsFromDef = [lower, upper].reduce((acc, expr) => {
        return arrayUnion(acc, scanUdRsVarRefs(expr, this).rsVarRefs);
    }, []);
    const rsVars = arrayUnion(rsVarsFromBody, rsVarsFromDef);

    return {
        type: "sumClause",
        ctxVarDef: {
            type: "ctxVarDef",
            name: ctxVarName,
            subtype: 'range',
            lower: lower,
            upper: upper,
            _astId: nextAstId(),
        },
        content: content,
        rsVarDepType: analyzeRsVarDepType(rsVars),
        rsVars,
        forbiddenNames: rsVarsFromBody,
    }
}

ExprDSLCSTVisitor.prototype.prod = function (ctx: any): ProdClauseASTNode {
    const ctxVarName = this.visit(ctx.ctxVar);
    const lower = this.visit(ctx.lower);
    const upper = this.visit(ctx.upper);
    const content = this.visit(ctx.content);

    const rsVarsFromBody = scanUdRsVarRefs(content, this).rsVarRefs;
    const rsVarsFromDef = [lower, upper].reduce((acc, expr) => {
        return arrayUnion(acc, scanUdRsVarRefs(expr, this).rsVarRefs);
    }, []);
    const rsVars = arrayUnion(rsVarsFromBody, rsVarsFromDef);

    return {
        type: "prodClause",
        ctxVarDef: {
            type: "ctxVarDef",
            name: ctxVarName,
            subtype: 'range',
            lower: lower,
            upper: upper,
            _astId: nextAstId(),
        },
        content: content,
        rsVarDepType: analyzeRsVarDepType(rsVars),
        rsVars,
        forbiddenNames: rsVarsFromBody,
    }
}

// We need to find 'dx' in the content
const dxPattern = createRegExp(
    exactly("d")
        .notBefore(ctxVarNameExcludePattern),
    identifierPattern.groupedAs("name"),
)
ExprDSLCSTVisitor.prototype.int = function (ctx: any): IntClauseASTNode {
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
        const rsVarsFromBody = scanUdRsVarRefs(content, this).rsVarRefs;
        const rsVarsFromDef = [lower, upper].reduce((acc, expr) => {
            return arrayUnion(acc, scanUdRsVarRefs(expr, this).rsVarRefs);
        }, []);
        const rsVars = arrayUnion(rsVarsFromBody, rsVarsFromDef);
        return {
            type: "intClause" as const,
            ctxVarDef: {
                type: "ctxVarDef" as const,
                name: ctxVarName,
                subtype: 'range' as const,
                lower: lower,
                upper: upper,
                _astId: nextAstId(),
            },
            content: content,
            rsVarDepType: analyzeRsVarDepType(rsVars),
            rsVars,
            forbiddenNames: rsVarsFromBody,
        }
    }

    // only one node ?! good
    if (flattened.opTypes.length === 0) {
        ctxVarName = matchMaybeDx(flattened.nodes[0]);
        if (!ctxVarName) {
            throw new Error(
                `Failed to find 'dx'-like syntax in integral clause.`
            );
        }
        return mkResult(ctxVarName, null);
    }

    // Seek leftmost in mult/div chain - imult chain
    if (flattened.opTypes[0] === 'implicitMult') {
        ctxVarName = matchMaybeDx(flattened.nodes[0]);
    }
    // shift left
    if (ctxVarName) {
        flattened.nodes.shift();
        flattened.opTypes.shift();
        return mkResult(ctxVarName, unflattenMultLevel(flattened));
    }


    // Seek rightmost in mult/div chain - imult chain
    if (flattened.opTypes[flattened.opTypes.length - 1] === 'implicitMult') {
        ctxVarName = matchMaybeDx(flattened.nodes[flattened.nodes.length - 1]);
    }
    if (ctxVarName) {
        flattened.nodes.pop();
        flattened.opTypes.pop();
        return mkResult(ctxVarName, unflattenMultLevel(flattened));
    }

    throw new Error(
        `Failed to find 'dx'-like syntax in integral clause.`
    );
}

ExprDSLCSTVisitor.prototype.diff = function (ctx: any): DiffClauseASTNode {
    const ctxVarName = this.visit(ctx.ctxVar);
    const content = this.visit(ctx.content);

    const rsVarsFromBody = scanUdRsVarRefs(content, this).rsVarRefs;
    return {
        type: "diffClause",
        ctxVarDef: {
            type: "ctxVarDef",
            name: ctxVarName,
            subtype: 'null',
            _astId: nextAstId(),
        },
        content: content,
        rsVarDepType: analyzeRsVarDepType(rsVarsFromBody),
        rsVars: rsVarsFromBody,
        forbiddenNames: rsVarsFromBody,
    }
}