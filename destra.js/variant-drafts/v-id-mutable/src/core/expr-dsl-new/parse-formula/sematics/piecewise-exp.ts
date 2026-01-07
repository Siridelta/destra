import { IToken } from "chevrotain";
import { FormulaVisitor } from "./base-visitor";
import { ComparisonASTNode } from "./helpers";


declare module './base-visitor' {
    interface FormulaVisitor {
        piecewiseExp(ctx: any): any;
        piecewise_content(ctx: any): any;
        piecewise_branch(ctx: any): any;
        piecewise_compLevel(ctx: any): any;
        piecewise_actionLevel(ctx: any): any;
        piecewise_addSubLevel(ctx: any): any;
        piecewise_contextLevel(ctx: any): any;
    }
}


export type PiecewiseExpASTNode = {
    type: "piecewiseExp",
    branches: PiecewiseBranchASTNode[],
    default: any | null,
}
export type PiecewiseBranchASTNode = {
    type: "piecewiseBranch",
    condition: ComparisonASTNode,
    value: any | null,
}

FormulaVisitor.prototype.piecewiseExp = function (ctx: any) {
    return this.visit(ctx.piecewise_content);
}

FormulaVisitor.prototype.piecewise_content = function (ctx: any) {
    const branches = this.visit(ctx.piecewise_branch);
    let defaultValue: any | null = null;

    // scan for the last term being possible default,
    // and no non-branch expr (as default) exists other than that.
    for (let i = 0; i < branches.length; i++) {
        const branch = branches[i];
        if (branch?.type !== "piecewiseBranch") {
            if (i !== branches.length - 1) {
                throw new Error(
                    `Invalid piecewise branch syntax: condition not found at branch ${i + 1}. `
                    + `Every branch must have a condition, except the last branch which may specify the default value `
                    + `when written without condition.`
                );
            }
            defaultValue = branch;
            break;
        }
    }

    // Piecewise special check: Check the usage of for and with clauses.
    // unless in the lase branch (conditional branch or default branch),
    // you cannot use for/with clauses with multiple context variables;
    // Or it will introduce comma ('(a, b) for a = [1...10], b = [1...10]'), 
    // and conflict with its meaning of seperating branches in piecewise expression.
    // desmos will report an error in this case.
    for (let i = 0; i < branches.length - 1; i++) {
        const branch = branches[i];
        if (i === branches.length - 1) {
            continue;
        }
        if (branch?.type === "forClause" || branch?.type === "withClause") {
            if (branch.ctxVarDefs.length > 1) {
                throw new Error(
                    `Invalid piecewise branch syntax: multiple context variables found in for/with clause at branch ${i + 1}. `
                    + `In a piecewise expression, you cannot use for/with clauses with multiple context variables `
                    + `except in the last branch (conditional branch or default branch).`
                );
            }
        }
    }

    // Remove the default value branch from 'branches' array.
    if (defaultValue) {
        branches.splice(branches.length - 1, 1);
    }

    return {
        type: "piecewiseExp",
        branches: branches,
        default: defaultValue,
    }
}

FormulaVisitor.prototype.piecewise_branch = function (ctx: any) {
    const [condition] = ctx.piecewise_compLevel ? this.visit(ctx.piecewise_compLevel) : [null];
    const [value] = ctx.piecewise_actionLevel ? this.visit(ctx.piecewise_actionLevel) : [null];
    return {
        type: "piecewiseBranch",
        condition,
        value,
    }
}

FormulaVisitor.prototype.piecewise_compLevel = function (ctx: any) {
    const operands = this.visit(ctx.piecewise_actionLevel);
    const ops1 = ctx.ComparisonOperator1 as IToken[] ?? null;
    const ops2 = ctx.ComparisonOperator2 as IToken[] ?? null;

    if (ops1 && ops2) {
        throw new Error("Internal error: multiple comparison operators found in piecewise_compLevel.");
    }
    if (!ops1 && !ops2) {
        throw new Error("Internal error: no comparison operator found in piecewise_compLevel.");
    }
    if (operands.length === 0) {
        throw new Error("Internal error: operands not found in piecewise_compLevel.");
    }
    return {
        type: "comparison",
        operands,
        operators: (ops1 ?? ops2).map(op => op.image),
    }
}

FormulaVisitor.prototype.piecewise_actionLevel = function (ctx: any) {
    const items = this.visit(ctx.addSubLevel);
    if (items.length < 1 || items.length > 2) {
        throw new Error("Internal error: items not found in piecewise_actionLevel.");
    }
    if (items.length === 1) {
        return items[0];
    }
    // else it is an action
    if (items[0].type !== "substitution") {
        throw new Error(
            `Invalid target in action expression. `
            + `Expected a interpolated variable, got type '${items[0].type}'.`
        );
    }
    return {
        type: "action",
        target: items[0],
        value: items[1],
    }
}