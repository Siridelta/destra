import { anyOf, exactly, createRegExp, digit, maybe } from "magic-regexp";
import { ExprDSLCSTVisitor } from "../base-visitor";

declare module '../base-visitor' {
    interface ExprDSLCSTVisitor {
        toNumberAST(image: string): NumberASTNode;
        toColorHexLiteralAST(image: string): ColorHexLiteralASTNode;
        toSubstitutionAST(image: string): SubstitutionASTNode;
        toConstantAST(image: string): ConstantASTNode;
        toBuiltinFuncAST(image: string): BuiltinFuncASTNode;
        toReservedVarAST(image: string): ReservedVarASTNode;
        toContextVarAST(image: string): ContextVarASTNode;
        toUndefinedVarAST(image: string): UndefinedVarASTNode;
        toVarIR(image: string): VarIRNode;
    }
}

export type NumberASTNode = {
    type: "number",
    base: {
        integer?: string,
        decimal?: string,
    },
    exponent?: {
        sign?: '+' | '-',
        integer: string,
    },
}

export type ColorHexLiteralASTNode = {
    type: "colorHexLiteral",
    value: string,
}

export type SubstitutionASTNode = {
    type: "substitution",
    index: number,
}

export type BuiltinFuncASTNode = {
    type: "builtinFunc",
    name: string,
}

export type ConstantASTNode = {
    type: "constant",
    value: string,
}

export type ReservedVarASTNode = {
    type: "reservedVar",
    name: string,
}

export type ContextVarASTNode = {
    type: "contextVar",
    name: string,
}

export type UndefinedVarASTNode = {
    type: "undefinedVar",
    name: string,
}

// IR for not sure if it is reserved var or ctx var overriding reserved name
export type VarIRNode = {
    type: "varIR",
    name: string,
}

export type TerminalASTNode<allowIR extends boolean = false> =
    | NumberASTNode
    | ColorHexLiteralASTNode
    | ConstantASTNode
    | SubstitutionASTNode
    | ReservedVarASTNode
    | ContextVarASTNode
    | UndefinedVarASTNode
    | (allowIR extends true ?
        | VarIRNode
        : never);
export function isTerminalASTNode(node: any): node is TerminalASTNode {
    return (
        node?.type === "number"
        || node?.type === "colorHexLiteral"
        || node?.type === "substitution"
        || node?.type === "constant"
        || node?.type === "reservedVar"
        || node?.type === "contextVar"
        || node?.type === "undefinedVar"
        || node?.type === "builtinFunc"
        || node?.type === "varIR"
    );
}

export const numberRegex = createRegExp(
    // 数值 / 科学计数法底数
    anyOf(
        // 必带整数部分，可选小数部分，123.456, 123., ...
        exactly(
            digit.times.atLeast(1).groupedAs("integer"),
            maybe(
                ".",
                digit.times.any().groupedAs("decimal1"),
            ),
        ),
        // 无整数部分，必带小数部分，.456, .4567, ...
        exactly(
            ".",
            digit.times.atLeast(1).groupedAs("decimal2"),
        ),
    ),
    // 可选科学计数法后续部分
    // magic-regexp bug: you must wrap an anyOf 
    // or the 'maybe' question mark suffix would only add to the last term (exponent integer)
    maybe(anyOf(
        anyOf("e", "E"),
        maybe(anyOf("-", "+").groupedAs("exponentSign")),
        digit.times.atLeast(1).groupedAs("exponentInteger"),
    )),
)

ExprDSLCSTVisitor.prototype.toNumberAST = function (image: string): NumberASTNode {
    const match = image.match(numberRegex);
    if (!match) {
        throw new Error(`Internal error: Reveiced invalid number literal: ${image}`);
    }
    const { integer, decimal1, decimal2, exponentSign, exponentInteger } = match.groups!;
    const decimal = decimal1 || decimal2;

    return {
        type: "number",
        base: {
            integer: integer,
            decimal: decimal,
        },
        exponent: exponentInteger ? {
            sign: exponentSign as '+' | '-' | undefined,
            integer: exponentInteger,
        } : undefined,
    }
}

ExprDSLCSTVisitor.prototype.toBuiltinFuncAST = function (image: string): BuiltinFuncASTNode {
    return {
        type: "builtinFunc",
        name: image,
    }
}

ExprDSLCSTVisitor.prototype.toConstantAST = function (image: string): ConstantASTNode {
    return {
        type: "constant",
        value: image,
    }
}

export const colorHexLiteralRegex = /#(?<hex>([0-9A-F]{6}|[0-9a-f]{6}))/
ExprDSLCSTVisitor.prototype.toColorHexLiteralAST = function (image: string): ColorHexLiteralASTNode {
    const match = image.match(colorHexLiteralRegex);
    if (!match) {
        throw new Error(`Internal error: Reveiced invalid color hex literal: ${image}`);
    }
    const { hex } = match.groups!;
    return {
        type: "colorHexLiteral",
        value: hex,
    }
}

export const substitutionRegex = createRegExp(
    "$",
    digit.times.atLeast(1).groupedAs("index"),
    "$",
)
ExprDSLCSTVisitor.prototype.toSubstitutionAST = function (image: string): SubstitutionASTNode {
    const match = image.match(substitutionRegex);
    if (!match) {
        throw new Error(`Internal error: Reveiced invalid substitution literal: ${image}`);
    }
    const { index } = match.groups!;
    return {
        type: "substitution",
        index: Number(index),
    }
}

ExprDSLCSTVisitor.prototype.toReservedVarAST = function (image: string): ReservedVarASTNode {
    return {
        type: "reservedVar",
        name: image,
    }
}

ExprDSLCSTVisitor.prototype.toContextVarAST = function (image: string): ContextVarASTNode {
    return {
        type: "contextVar",
        name: image,
    }
}

ExprDSLCSTVisitor.prototype.toUndefinedVarAST = function (image: string): UndefinedVarASTNode {
    return {
        type: "undefinedVar",
        name: image,
    }
}

ExprDSLCSTVisitor.prototype.toVarIR = function (image: string): VarIRNode {
    return {
        type: "varIR",
        name: image,
    }
}