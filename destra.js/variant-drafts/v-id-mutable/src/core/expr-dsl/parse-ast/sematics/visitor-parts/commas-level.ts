import { ExprDSLCSTVisitor } from "../base-visitor";
import { isUpToAddSubLevelASTNode, UpToAddSubLevel } from "./addSub-level";
import { SubstitutionASTNode } from "./terminals";


declare module '../base-visitor' {
    interface ExprDSLCSTVisitor {
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
    target: SubstitutionASTNode,
    value: any,
}

export type UpToCommasLevel =
    | CommasASTNode
    | UpToActionLevel;
export type UpToActionLevel =
    | ActionASTNode
    | UpToAddSubLevel;

export function isCommasASTNode(node: any): node is CommasASTNode {
    return node?.type === 'commas';
}
export function isActionASTNode(node: any): node is ActionASTNode {
    return node?.type === 'action';
}

export function isUpToCommasLevelASTNode(node: any): node is UpToCommasLevel {
    return isCommasASTNode(node)
        || isUpToActionLevelASTNode(node);
}
export function isUpToActionLevelASTNode(node: any): node is UpToActionLevel {
    return isActionASTNode(node)
        || isUpToAddSubLevelASTNode(node);
}

ExprDSLCSTVisitor.prototype.commasLevel = function (ctx: any): any {
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

ExprDSLCSTVisitor.prototype.actionLevel = function (ctx: any): any {
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