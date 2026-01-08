import { anyOf, exactly, createRegExp, digit, maybe } from "magic-regexp";
import { FormulaVisitor } from "./base-visitor";

declare module './base-visitor' {
    interface FormulaVisitor {
        toNumberAST(image: string): NumberASTNode;
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
    sign?: '+' | '-',
    base: {
        integer?: string,
        decimal?: string,
    },
    exponent?: {
        sign?: '+' | '-',
        integer: string,
    },
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

FormulaVisitor.prototype.toNumberAST = function (image: string): NumberASTNode {
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

FormulaVisitor.prototype.toBuiltinFuncAST = function (image: string): BuiltinFuncASTNode {
    return {
        type: "builtinFunc",
        name: image,
    }
}

FormulaVisitor.prototype.toConstantAST = function (image: string): ConstantASTNode {
    return {
        type: "constant",
        value: image,
    }
}

export const substitutionRegex = createRegExp(
    "$",
    digit.times.atLeast(1).groupedAs("index"),
    "$",
)
FormulaVisitor.prototype.toSubstitutionAST = function (image: string): SubstitutionASTNode {
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

FormulaVisitor.prototype.toReservedVarAST = function (image: string): ReservedVarASTNode {
    return {
        type: "reservedVar",
        name: image,
    }
}

FormulaVisitor.prototype.toContextVarAST = function (image: string): ContextVarASTNode {
    return {
        type: "contextVar",
        name: image,
    }
}

FormulaVisitor.prototype.toUndefinedVarAST = function (image: string): UndefinedVarASTNode {
    return {
        type: "undefinedVar",
        name: image,
    }
}

FormulaVisitor.prototype.toVarIR = function (image: string): VarIRNode {
    return {
        type: "varIR",
        name: image,
    }
}