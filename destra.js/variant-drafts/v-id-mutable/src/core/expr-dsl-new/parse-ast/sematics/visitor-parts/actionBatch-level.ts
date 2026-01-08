import { FormulaVisitor } from "../base-visitor";


declare module '../base-visitor' {
    interface FormulaVisitor {
        actionBatchLevel(ctx: any): any;
        actionLevel(ctx: any): any;
    }
}

export type ActionBatchASTNode = {
    type: "actionBatch",
    actions: ActionASTNode[],
}
export type ActionASTNode = {
    type: "action",
    target: any, // TODO: placeholder (substitution) AST Node
    value: any,
}
export type PointCoordsIRNode = {
    type: "pointCoordsIR",
    coords: any[],
}

interface VisitorActionBatchLevelParams {
    inParen: boolean;    // in parentheses. in this case we tolerate non-actually-action AST, 
                         // cuz in this case it stands for literal syntax for creating point: (myX, myY, myZ)
}

FormulaVisitor.prototype.actionBatchLevel = function (ctx: any, params?: VisitorActionBatchLevelParams): any {
    const actionLevels = this.batchVisit(ctx.actionLevel);
    const inParen = params?.inParen ?? false;

    if (actionLevels.length === 0) {
        throw new Error('Internal error: actionBatchLevel should not be empty.');
    }
    if (actionLevels.length === 1) {
        return actionLevels[0];
    }

    // There's 2 cases: Point literal or action batch. This is the predicate of it:
    const isActionBatch = inParen && actionLevels[0].type === "action";

    if (!isActionBatch) {
        // tolerate policy
        return {
            type: "pointCoordsIR",
            coords: actionLevels
        }
    }

    // strictly check each Action item
    for (let i = 0; i < actionLevels.length; i++) {
        const actionLevel = actionLevels[i];
        if (actionLevel.type !== "action") {
            throw new Error(
                `Invalid action in action batch at index ${i}. `
                + `Expected type 'action', got type '${actionLevel.type}'.`
            );
        }
    }
    return {
        type: "actionBatch",
        actions: actionLevels,
    }
}

FormulaVisitor.prototype.actionLevel = function (ctx: any): any {
    const target = this.visit(ctx.target);
    const value = ctx.value ? this.visit(ctx.value) : null;

    if (!value) {
        return target;
    }
    if (target.type !== "substitution") {
        throw new Error(
            `Invalid target in action expression. `
            + `Expected a interpolated variable, got type '${target.type}'.`
        );
    }
    return {
        type: "action",
        target,
        value,
    }
}