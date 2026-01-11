import { FormulaVisitor } from "../base-visitor";
import { BuiltinFuncASTNode } from "./terminals";
import { MaybeOCallFuncIRNode } from "./atomic-exps";
import { getASTChildren } from "../traverse-ast";
import { isUpToPostfixLevelASTNode, UpToPostfixLevel } from "./postfix-level";


declare module '../base-visitor' {
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
export type CrossASTNode = {
    type: "cross",
    left: any,
    right: any,
}
export type PercentOfASTNode = {
    type: "percentOf",
    left: any,
    right: any,
}
export type ModASTNode = {
    type: "mod",
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

export type MultDivLevelASTNode =
    | MultiplicationASTNode
    | DivisionASTNode
    | CrossASTNode
    | PercentOfASTNode
    | ModASTNode;
export type PrefixLevelASTNode =
    | UnaryMinusASTNode
    | UnaryPlusASTNode;

export type UpToMultDivLevel<allowIR extends boolean = false> =
    | MultDivLevelASTNode
    | UpToOmittedCallLevel<allowIR>;
export type UpToOmittedCallLevel<allowIR extends boolean = false> =
    | OmittedCallASTNode
    | UpToImplicitMultLevel<allowIR>;
export type UpToImplicitMultLevel<allowIR extends boolean = false> =
    | ImplicitMultASTNode
    | UpToPrefixLevel<allowIR>;
export type UpToPrefixLevel<allowIR extends boolean = false> =
    | PrefixLevelASTNode
    | UpToRootofLevel<allowIR>;
export type UpToRootofLevel<allowIR extends boolean = false> =
    | RootofASTNode
    | UpToPowerLevel<allowIR>;
export type UpToPowerLevel<allowIR extends boolean = false> =
    | PowerASTNode
    | UpToPostfixLevel<allowIR>;

export function isMultDivLevelASTNode(node: any): node is MultDivLevelASTNode {
    return (
        node?.type === 'multiplication'
        || node?.type === 'division'
        || node?.type === 'cross'
        || node?.type === 'percentOf'
        || node?.type === 'mod'
    );
}
export function isOmittedCallASTNode(node: any): node is OmittedCallASTNode {
    return node?.type === 'omittedCall';
}
export function isImplicitMultASTNode(node: any): node is ImplicitMultASTNode {
    return node?.type === 'implicitMult';
}
export function isPrefixLevelASTNode(node: any): node is PrefixLevelASTNode {
    return node?.type === 'unaryMinus' || node?.type === 'unaryPlus';
}
export function isRootofASTNode(node: any): node is RootofASTNode {
    return node?.type === 'rootof';
}
export function isPowerASTNode(node: any): node is PowerASTNode {
    return node?.type === 'power';
}

export function isUpToMultDivLevelASTNode(node: any): node is UpToMultDivLevel {
    return isMultDivLevelASTNode(node)
        || isUpToOmittedCallLevelASTNode(node);
}
export function isUpToOmittedCallLevelASTNode(node: any): node is UpToOmittedCallLevel {
    return isOmittedCallASTNode(node)
        || isUpToImplicitMultLevelASTNode(node);
}
export function isUpToImplicitMultLevelASTNode(node: any): node is UpToImplicitMultLevel {
    return isImplicitMultASTNode(node)
        || isUpToPrefixLevelASTNode(node);
}
export function isUpToPrefixLevelASTNode(node: any): node is UpToPrefixLevel {
    return isPrefixLevelASTNode(node)
        || isUpToRootofLevelASTNode(node);
}
export function isUpToRootofLevelASTNode(node: any): node is UpToRootofLevel {
    return isRootofASTNode(node)
        || isUpToPowerLevelASTNode(node);
}
export function isUpToPowerLevelASTNode(node: any): node is UpToPowerLevel {
    return isPowerASTNode(node)
        || isUpToPostfixLevelASTNode(node);
}


export const multDivOpToType = (op: string) =>
    op === '*' ? 'multiplication' :
        op === '/' ? 'division' :
            op === 'cross' ? 'cross' :
                op === '%of' ? 'percentOf' :
                    op === '%' ? 'mod' : null;
FormulaVisitor.prototype.multDivLevel = function (ctx: any) {
    // Transform to left-associative AST tree

    const lhs = this.visit(ctx.lhs);
    const operator = ctx.operator?.[0]?.image || null;
    const rhs = ctx.rhs ? this.visit(ctx.rhs) : null;

    if (operator && rhs && isMultDivLevelASTNode(rhs)) {
        // deep seek rhs's left-most mult/div child
        let currentNode = rhs;

        while (isMultDivLevelASTNode(currentNode.left)) {
            currentNode = currentNode.left;
        }
        // here currentNode is the left-most mult/div child
        currentNode.left = {
            type: multDivOpToType(operator),
            left: lhs,
            right: currentNode.left,
        }
        return rhs;
    }
    if (operator && rhs) {
        return {
            type: multDivOpToType(operator),
            left: lhs,
            right: rhs,
        }
    }
    return lhs;
}

// Ensure there is no OCallIR wrapped in anything else
function traverseCheckOCallIR(node: any, isTop: boolean = true): boolean {
    if (node?.type === 'maybeOCallFuncIR' && !isTop) {
        return false;
    }
    for (const child of getASTChildren(node, true)) {
        if (child && !traverseCheckOCallIR(child, false)) {
            const oCallIR = child as MaybeOCallFuncIRNode;
            throw new Error(
                `Unexpected operation on Function Identifier (Supports Omitted Call Syntax) '${oCallIR.func.name}'. `
                + `Context: ${JSON.stringify(node)}`
            );
        }
    }
    return true;
}

FormulaVisitor.prototype.iMultAndOCallLevel = function (ctx: any) {
    const nodes = this.batchVisit(ctx.prefixLevel);

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

    nodes.forEach(node => traverseCheckOCallIR(node));

    const iMultItems: any[] = [];
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (i === nodes.length - 1) {
            iMultItems.push(node);
            continue;
        }
        const nextNode = nodes[i + 1];

        if (node.type === 'maybeOCallFuncIR') {
            const builtinFunc = node.func;

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

export interface FlattenedMultLevel {
    nodes: any[];
    opTypes: (MultDivLevelASTNode['type'] | ImplicitMultASTNode['type'])[];
}
export const flattenMultLevel = (ast: any): any => {
    const nodes: FlattenedMultLevel['nodes'] = [];
    const ops: FlattenedMultLevel['opTypes'] = [];

    const visitMultDivLevel = (node: any) => {
        if (isMultDivLevelASTNode(node)) {
            visitMultDivLevel(node.left);
            ops.push(node.type);
            visitMultDivLevel(node.right);
        } else if (node.type === 'implicitMult') {
            visitImplicitMult(node);
        } else {
            nodes.push(node);
        }
    }
    const visitImplicitMult = (node: any) => {
        for (let i = 0; i < node.operands.length; i++) {
            const operand = node.operands[i];
            nodes.push(operand);
            if (i < node.operands.length - 1) {
                ops.push('implicitMult');
            }
        }
    }
    visitMultDivLevel(ast);
    return {
        nodes,
        ops,
    }
}
export const unflattenMultLevel = (flattened: FlattenedMultLevel): any => {
    const nodes = flattened.nodes;
    const ops = flattened.opTypes;
    let ast: any = nodes[0];
    for (let i = 0; i < ops.length; i++) {
        const nextNode = nodes[i + 1];
        const op = ops[i];
        if (isMultDivLevelASTNode(ast)) {
            if (op === 'implicitMult') {
                if (ast.right.type === 'implicitMult') {
                    ast.right.operands.push(nextNode);
                } else {
                    ast.right = {
                        type: 'implicitMult',
                        operands: [ast.right, nextNode],
                    }
                }
            } else {
                ast = {
                    type: multDivOpToType(op),
                    left: ast,
                    right: nextNode,
                }
            }
        } else if (ast.type === 'implicitMult') {
            if (op === 'implicitMult') {
                ast.operands.push(nextNode);
            } else {
                ast = {
                    type: multDivOpToType(op),
                    left: ast,
                    right: nextNode,
                }
            }
        } else {
            if (op === 'implicitMult') {
                ast = {
                    type: 'implicitMult',
                    operands: [ast],
                }
            } else {
                ast = {
                    type: multDivOpToType(op),
                    left: ast,
                    right: nextNode,
                }
            }
        }
    }
    return ast;
}

FormulaVisitor.prototype.prefixLevel = function (ctx: any) {
    const operator = ctx.operator?.[0]?.image ?? null;
    const content = this.visit(ctx.rootofLevel);

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
    const lhs = this.visit(ctx.powerLevel);
    const rhs = ctx.rootofLevel ? this.visit(ctx.rootofLevel) : null;

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
    const lhs = ctx.postfixLevel ? this.visit(ctx.postfixLevel) 
                : ctx.context_type1 ? this.visit(ctx.context_type1) : null;
    const rhs = ctx.powerLevel ? this.visit(ctx.powerLevel) : null;

    if (rhs) {
        return {
            type: "power",
            base: lhs,
            exponent: rhs,
        }
    }
    return lhs;
}