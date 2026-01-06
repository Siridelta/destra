import { anyOf, exactly, createRegExp, digit, maybe } from "magic-regexp";
import { FormulaVisitor } from "./base-visitor";

declare module './base-visitor' {
    interface FormulaVisitor {
        toNumberAST(ctx: any): any;
        toSubstitutionAST(ctx: any): any;
        // ...
        // ...
        toBuiltinFuncAST(ctx: any): any;
        // ...
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

export const numberRegex = createRegExp(
    // 可选正负号
    maybe(anyOf("-", "+").groupedAs("sign")),
    // 数值 / 科学计数法底数
    anyOf(
        // 必带整数部分，可选小数部分，123.456, 123., ...
        exactly(
            digit.times.atLeast(1).groupedAs("integer"),
            maybe(
                ".",
                digit.times.any().groupedAs("decimal"),
            ),
        ),
        // 无整数部分，必带小数部分，.456, .4567, ...
        exactly(
            ".",
            digit.times.atLeast(1).groupedAs("decimal"),
        ),
    ),
    // 可选科学计数法后续部分
    maybe(
        anyOf("e", "E"),
        maybe(anyOf("-", "+").groupedAs("exponentSign")),
        digit.times.atLeast(1).groupedAs("exponentInteger"),
    ),
)

FormulaVisitor.prototype.toNumberAST = function (image: string): NumberASTNode {
    const match = image.match(numberRegex);
    if (!match) {
        throw new Error(`Internal error: Reveiced invalid number literal: ${image}`);
    }
    const { sign, integer, decimal, exponentSign, exponentInteger } = match.groups!;

    return {
        type: "number",
        sign: sign as '+' | '-' | undefined,
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

FormulaVisitor.prototype.toBuiltinFuncAST = function (image: string): BuiltinFuncASTNode {
    return {
        type: "builtinFunc",
        name: image,
    }
}