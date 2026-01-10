import { createRegExp, exactly } from "magic-regexp";
import { ctxVarNameExcludePattern, identifierPattern } from "../../../syntax-reference/commonRegExpPatterns";
import { FormulaVisitor } from "../base-visitor";
import { flattenMultLevel, isMultDivType, unflattenMultLevel } from "./multDiv-level";
import { analyzeRsVarDepType, arrayUnion, RsVarDepType, scanUdRsVarRefs } from "../helpers";


declare module '../base-visitor' {
    interface FormulaVisitor {
        addSubLevel(ctx: any): any;
        context_type2_level(ctx: any): any;
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

export type ForClauseASTNode = {
    type: "forClause",
    ctxVarDefs: CtxVarExprDefASTNode[],
    content: any,
    rsVarDepType: RsVarDepType | null,
    rsVars: string[],
    forbiddenNames: string[],
}
export type WithClauseASTNode = {
    type: "withClause",
    ctxVarDefs: CtxVarExprDefASTNode[],
    content: any,
    rsVarDepType: RsVarDepType | null,
    rsVars: string[],
    forbiddenNames: string[],
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

        const rsVarsFromBody = scanUdRsVarRefs(content, this).rsVarRefs;
        const rsVarsFromDef = forCtxVarDefs.reduce((acc, def) => {
            return arrayUnion(acc, scanUdRsVarRefs(def, this).rsVarRefs);
        }, [] as string[]);
        const rsVars = arrayUnion(rsVarsFromBody, rsVarsFromDef);
        return {
            type: "forClause",
            ctxVarDefs: forCtxVarDefs,  
            content: content,
            rsVarDepType: analyzeRsVarDepType(rsVars),
            rsVars,
            forbiddenNames: rsVarsFromBody,
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

        const rsVarsFromBody = scanUdRsVarRefs(content, this).rsVarRefs;
        const rsVarsFromDef = withCtxVarDefs.reduce((acc, def) => {
            return arrayUnion(acc, scanUdRsVarRefs(def, this).rsVarRefs);
        }, [] as string[]);
        const rsVars = arrayUnion(rsVarsFromBody, rsVarsFromDef);
        return {
            type: "withClause",
            ctxVarDefs: withCtxVarDefs,
            content: content,
            rsVarDepType: analyzeRsVarDepType(rsVars),
            rsVars,
            forbiddenNames: rsVarsFromBody,
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
