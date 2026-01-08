import { createRegExp, exactly } from "magic-regexp";
import { ctxVarNameExcludePattern, identifierPattern } from "../../../syntax-reference/commonRegExpPatterns";
import { FormulaVisitor } from "../base-visitor";
import { flattenMultLevel, isMultDivType, unflattenMultLevel } from "./multDiv-level";


declare module '../base-visitor' {
    interface FormulaVisitor {
        addSubLevel(ctx: any): any;
        contextLevel(ctx: any): any;
        context_type1(ctx: any): any;
        context_type2_level(ctx: any): any;
        sum(ctx: any): any;
        prod(ctx: any): any;
        int(ctx: any): any;
        diff(ctx: any): any;
        fromForKeyword(ctx: any): any;
        fromWithKeyword(ctx: any): any;
        ctxVarInDef(ctx: any): any;
    }
}

export type AdditionASTNode = {
    type: "addition",
    left: any,
    right: any,
}
export type SubtractionASTNode = {
    type: "subtraction",
    left: any,
    right: any,
}

export type CtxVarExprDefASTNode = {
    type: "ctxVarDef",
    name: string,
    subtype: 'expr',
    expr: any,
}
export type CtxVarRangeDefASTNode = {
    type: "ctxVarDef",
    name: string,
    subtype: 'range',
    lower: any,
    upper: any,
}
export type CtxVarNullDefASTNode = {
    type: "ctxVarDef",
    name: string,
    subtype: 'null',
}
export type CtxVarDefASTNode =
    | CtxVarExprDefASTNode
    | CtxVarRangeDefASTNode
    | CtxVarNullDefASTNode;

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
export type ForClauseASTNode = {
    type: "forClause",
    ctxVarDefs: CtxVarDefASTNode[],
    content: any,
}
export type WithClauseASTNode = {
    type: "withClause",
    ctxVarDefs: CtxVarDefASTNode[],
    content: any,
}

// Needed transform to left-associative AST tree
FormulaVisitor.prototype.addSubLevel = function (ctx: any): any {
    const lhs = this.visit(ctx.lhs);
    const operator = ctx.operator?.[0]?.image || null;
    const rhs = ctx.rhs ? this.visit(ctx.rhs) : null;
    if (operator && rhs
        && (rhs.type === 'addition' || rhs.type === 'subtraction')) {
        // deep seek rhs's left-most child
        let currentNode = rhs;
        while (
            currentNode.left.type === 'addition'
            || currentNode.left.type === 'subtraction'
        ) {
            currentNode = currentNode.left;
        }
        currentNode.left = {
            type: operator === '+' ? 'addition' : 'subtraction',
            left: lhs,
            right: currentNode.left,
        }
        return rhs;
    }
    if (operator && rhs) {
        return {
            type: operator === '+' ? 'addition' : 'subtraction',
            left: lhs,
            right: rhs,
        }
    }
    return lhs;
}

FormulaVisitor.prototype.contextLevel = function (ctx: any): any {
    const type1 = ctx.context_type1 ? this.visit(ctx.context_type1) : null;
    const type2 = this.visit(ctx.context_type2_level);
    if (type1) {
        return type1;
    }
    if (type2) {
        return type2;
    }
    throw new Error("Internal error: contextLevel should not be empty.");
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

function findDuplicateVarNames(names: string[]): string[] {
    const uniqueNames = new Set<string>();
    const duplicateNames = new Set<string>();
    for (const name of names) {
        if (!uniqueNames.has(name)) {
            uniqueNames.add(name);
        } else {
            duplicateNames.add(name);
        }
    }
    return Array.from(duplicateNames);
}

FormulaVisitor.prototype.context_type2_level = function (ctx: any): any {
    const content = this.visit(ctx.content);
    const forCtxVarDefs = ctx.fromForKeyword ? this.visit(ctx.fromForKeyword) as CtxVarExprDefASTNode[] : null;
    const withCtxVarDefs = ctx.fromWithKeyword ? this.visit(ctx.fromWithKeyword) as CtxVarExprDefASTNode[] : null;
    if (forCtxVarDefs) {
        const duplicateNames = findDuplicateVarNames(forCtxVarDefs.map(d => d.name));
        if (duplicateNames.length > 0) {
            throw new Error(
                `Found duplicate definitions in 'for' clause: ${duplicateNames.join(', ')}. `
                + `In a 'for' clause, each context variable should be defined only once.`
            );
        }
        return {
            type: "forClause",
            ctxVarDefs: forCtxVarDefs,
            content: content,
        }
    }
    if (withCtxVarDefs) {
        const duplicateNames = findDuplicateVarNames(withCtxVarDefs.map(d => d.name));
        if (duplicateNames.length > 0) {
            throw new Error(
                `Found duplicate definitions in 'with' clause: ${duplicateNames.join(', ')}. `
                + `In a 'with' clause, each context variable should be defined only once.`
            );
        }
        return {
            type: "withClause",
            ctxVarDefs: withCtxVarDefs,
            content: content,
        }
    }
    return content;
}

FormulaVisitor.prototype.fromForKeyword = function (ctx: any): CtxVarExprDefASTNode[] {
    const ctxVarNames = this.batchVisit(ctx.ctxVar);
    const contents = this.batchVisit(ctx.content);

    if (ctxVarNames.length !== contents.length) {
        throw new Error("Internal error: fromForKeyword should have the same number of ctxVarNames and contents.");
    }
    const ctxVarDefs: CtxVarExprDefASTNode[] = [];
    for (let i = 0; i < ctxVarNames.length; i++) {
        ctxVarDefs.push({
            type: "ctxVarDef",
            name: ctxVarNames[i],
            subtype: 'expr',
            expr: contents[i],
        });
    }
    return ctxVarDefs;
}

FormulaVisitor.prototype.fromWithKeyword = function (ctx: any): CtxVarExprDefASTNode[] {
    const ctxVarNames = this.batchVisit(ctx.ctxVar);
    const contents = this.batchVisit(ctx.content);

    if (ctxVarNames.length !== contents.length) {
        throw new Error("Internal error: fromWithKeyword should have the same number of ctxVarNames and contents.");
    }
    const ctxVarDefs: CtxVarExprDefASTNode[] = [];
    for (let i = 0; i < ctxVarNames.length; i++) {
        ctxVarDefs.push({
            type: "ctxVarDef",
            name: ctxVarNames[i],
            subtype: 'expr',
            expr: contents[i],
        });
    }
    return ctxVarDefs;
}

FormulaVisitor.prototype.ctxVarInDef = function (ctx: any): string {
    const ctxVarName = ctx.ctxVarName[0];
    return ctxVarName.image;
}
