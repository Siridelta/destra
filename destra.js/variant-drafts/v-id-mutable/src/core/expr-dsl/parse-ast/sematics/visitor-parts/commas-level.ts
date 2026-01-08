import { FormulaVisitor } from "../base-visitor";


declare module '../base-visitor' {
    interface FormulaVisitor {
        commasLevel(ctx: any): any;
        actionLevel(ctx: any): any;
    }
}

export type CommasASTNode = {
    type: "commas",
    items: any[],
}
export type ActionASTNode = {
    type: "action",
    target: any, // TODO: placeholder (substitution) AST Node
    value: any,
}

FormulaVisitor.prototype.commasLevel = function (ctx: any): any {
    const actionLevels = this.batchVisit(ctx.actionLevel);

    if (actionLevels.length === 0) {
        throw new Error('Internal error: commasLevel should not be empty.');
    }
    if (actionLevels.length === 1) {
        return actionLevels[0];
    }

    return {
        type: "commas",
        items: actionLevels,
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