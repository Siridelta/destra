import { FormulaVisitor } from "./base-visitor";
import { BuiltinFuncASTNode } from "./terminals";
import { MaybeOCallFuncIRNode } from "./atomic-exps";


declare module './base-visitor' {
    interface FormulaVisitor {
        multDivLevel(ctx: any): any;
        iMultAndOCallLevel(ctx: any): any;
        prefixLevel(ctx: any): any;
        rootofLevel(ctx: any): any;
        powerLevel(ctx: any): any;
    }
}

export type MultiplicationASTNode = {
    type: "multiplication",
    left: any,
    right: any,
}
export type DivisionASTNode = {
    type: "division",
    left: any,
    right: any,
}
export type OmittedCallASTNode = {
    type: "omittedCall",
    func: BuiltinFuncASTNode,
    arg: any,
}
export type ImplicitMultASTNode = {
    type: "implicitMult",
    operands: any[],
}
export type UnaryMinusASTNode = {
    type: "unaryMinus",
    operand: any,
}
export type UnaryPlusASTNode = {
    type: "unaryPlus",
    operand: any,
}
export type RootofASTNode = {
    type: "rootof",
    index: any,
    operand: any,
}
export type PowerASTNode = {
    type: "power",
    base: any,
    exponent: any,
}


FormulaVisitor.prototype.multDivLevel = function (ctx: any) {
    // Transform to left-associative AST tree

    const [lhs] = this.visit(ctx.lhs);
    const operator = ctx.operator?.[0]?.image || null;
    const [rhs] = ctx.rhs ? this.visit(ctx.rhs) : [null];

    if (operator && rhs
        && (rhs.type === 'multiplication' || rhs.type === 'division')) {
        // deep seek rhs's left-most mult/div child
        let currentNode = rhs;
        while (
            currentNode.left.type === 'multiplication'
            || currentNode.left.type === 'division'
        ) {
            currentNode = currentNode.left;
        }
        // here currentNode is the left-most mult/div child
        currentNode.left = {
            type: operator === '*' ? 'multiplication' : 'division',
            left: lhs,
            right: currentNode.left,
        }
        return rhs;
    }
    if (operator && rhs) {
        return {
            type: operator === '*' ? 'multiplication' : 'division',
            left: lhs,
            right: rhs,
        }
    }
    return lhs;
}

// Ensure OCallIR is not wrapped in anything else
function traverseCheckOCallIR(node: any, isTop: boolean = true): boolean {
    if (node?.type === 'maybeOCallFuncIR' && !isTop) {
        return false;
    }
    for (const [key, value] of Object.entries(node)) {
        if (value && !traverseCheckOCallIR(value, false)) {
            const oCallIR = value as MaybeOCallFuncIRNode;
            throw new Error(
                `Unexpected operation on Function Identifier (Supports Omitted Call Syntax) '${oCallIR.func.name}'. `
                + `Context: ${JSON.stringify({ ...node, [key]: `[Function Identifier '${oCallIR.func.name}']` })}`
            );
        }
    }
    return true;
}

FormulaVisitor.prototype.iMultAndOCallLevel = function (ctx: any) {
    const nodes = this.visit(ctx.prefixLevel);

    // in imult-like chain, nodes may contains:
    // - prefixLevel exprs
    // - builtin, support omitted call function token
    // - builtin, not support omitted call function token
    // - parenExp or PointExp, exps that wraps in parenthesis. 

    // not allow cases:
    // - [ varIR / attrAccess ] + ParenExp / PointExp
    // - builtin, not support omitted call function token + anything (handled in atomic-exps.ts)
    // - builtin, support omitted call function token + [ 
    //     anything except constant / number / varIR / substitution
    //   ]

    // transforms:
    // - builtin, support omitted call function token + anything allowed -> OmittedCall

    traverseCheckOCallIR(nodes);

    const iMultItems: any[] = [];
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (i === nodes.length - 1) {
            iMultItems.push(node);
            continue;
        }
        const nextNode = nodes[i + 1];

        if (node.type === 'builtinFunc') {
            const builtinFunc = node as BuiltinFuncASTNode;

            if (!(
                nextNode.type === 'constant'
                || nextNode.type === 'number'
                || nextNode.type === 'varIR'
                || nextNode.type === 'substitution'
            )) {
                throw new Error(
                    `Attempted to call builtin function '${builtinFunc.name}' with a complex expression as argument. `
                    + `Please use parenthesis to call function '${builtinFunc.name}'. `
                );
            }

            iMultItems.push({
                type: "omittedCall",
                func: builtinFunc,
                arg: nextNode,
            });
            i += 1;
            continue;
        }

        if (
            nextNode.type === 'parenExp'
            || nextNode.type === 'pointExp'
        ) {
            if (node.type === 'varIR') {
                throw new Error(
                    `Ambiguous syntax: Variable Identifier '${node.name}' is followed by a Parenthesis. `
                    + `Please use '*' to express multiplication.`
                );
            }
            if (node.type === 'attrAccess') {
                throw new Error(
                    `Ambiguous syntax: Attribute Access '.${node.attr}' is followed by a Parenthesis. `
                    + `Please use '*' to express multiplication.`
                );
            }
        }

        iMultItems.push(node);
    }

    if (iMultItems.length === 1) {
        return iMultItems[0];
    }
    return {
        type: "implicitMult",
        operands: iMultItems,
    }
}

FormulaVisitor.prototype.prefixLevel = function (ctx: any) {
    const operator = ctx.operator?.[0]?.image ?? null;
    const [content] = this.visit(ctx.rootofLevel);

    if (operator) {
        return {
            type: operator === '-' ? 'unaryMinus' : 'unaryPlus',
            operand: content,
        }
    }
    return content;
}

FormulaVisitor.prototype.rootofLevel = function (ctx: any) {
    // right-associative, no need for transform
    const [lhs] = this.visit(ctx.powerLevel);
    const [rhs] = ctx.rootofLevel ? this.visit(ctx.rootofLevel) : [null];

    if (rhs) {
        return {
            type: "rootof",
            index: lhs,
            operand: rhs,
        }
    }
    return lhs;
}

FormulaVisitor.prototype.powerLevel = function (ctx: any) {
    // right-associative, no need for transform
    const [lhs] = this.visit(ctx.postfixLevel);
    const [rhs] = ctx.powerLevel ? this.visit(ctx.powerLevel) : [null];

    if (rhs) {
        return {
            type: "power",
            base: lhs,
            exponent: rhs,
        }
    }
    return lhs;
}