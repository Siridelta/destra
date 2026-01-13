import { nextAstId } from "../..";
import { ExprDSLCSTVisitor } from "../base-visitor";
import { analyzeRsVarDepType, arrayUnion, RsVarDepType, scanUdRsVarRefs } from "../helpers";
import { isUpToMultDivLevelASTNode, UpToMultDivLevel } from "./multDiv-level";


declare module '../base-visitor' {
    interface ExprDSLCSTVisitor {
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
    _astId: string,
}
export type CtxVarRangeDefASTNode = {
    type: "ctxVarDef",
    name: string,
    subtype: 'range',
    lower: any,
    upper: any,
    _astId: string,
}
export type CtxVarNullDefASTNode = {
    type: "ctxVarDef",
    name: string,
    subtype: 'null',
    _astId: string,
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

export type AddSubLevelASTNode =
    | AdditionASTNode
    | SubtractionASTNode;
export type ContextType2LevelASTNode =
    | ForClauseASTNode
    | WithClauseASTNode;

export type UpToAddSubLevel<allowIR extends boolean = false> =
    | AddSubLevelASTNode
    | UpToContextType2Level<allowIR>;
export type UpToContextType2Level<allowIR extends boolean = false> =
    | ContextType2LevelASTNode
    | UpToMultDivLevel<allowIR>;

export function isAddSubLevelASTNode(node: any): node is AddSubLevelASTNode {
    return node?.type === 'addition' || node?.type === 'subtraction';
}
export function isContextType2LevelASTNode(node: any): node is ContextType2LevelASTNode {
    return node?.type === 'forClause' || node?.type === 'withClause';
}
export function isUpToAddSubLevelASTNode(node: any): node is UpToAddSubLevel {
    return isAddSubLevelASTNode(node)
        || isUpToContextType2LevelASTNode(node);
}
export function isUpToContextType2LevelASTNode(node: any): node is UpToContextType2Level {
    return isContextType2LevelASTNode(node)
        || isUpToMultDivLevelASTNode(node);
}

// Needed transform to left-associative AST tree
ExprDSLCSTVisitor.prototype.addSubLevel = function (ctx: any): any {
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

ExprDSLCSTVisitor.prototype.context_type2_level = function (ctx: any): any {
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

ExprDSLCSTVisitor.prototype.fromForKeyword = function (ctx: any): CtxVarExprDefASTNode[] {
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
            _astId: nextAstId(),
        });
    }
    return ctxVarDefs;
}

ExprDSLCSTVisitor.prototype.fromWithKeyword = function (ctx: any): CtxVarExprDefASTNode[] {
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
            _astId: nextAstId(),
        });
    }
    return ctxVarDefs;
}

ExprDSLCSTVisitor.prototype.ctxVarInDef = function (ctx: any): string {
    const ctxVarName = ctx.ctxVarName[0];
    return ctxVarName.image;
}
