import { FormulaVisitor } from "./base-visitor";


declare module './base-visitor' {
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

FormulaVisitor.prototype.actionBatchLevel = function (ctx: any): any {
    const actionLevels = this.visit(ctx.actionBatchLevel);
    if (actionLevels.length === 1) {
        return actionLevels[0];
    }
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
    const [target] = this.visit(ctx.target);
    const [value] = ctx.value ? this.visit(ctx.value) : [null];

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