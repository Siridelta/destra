/**
 * 共用 (common) 的正则表达式定义
 */

import { oneOrMore, wordChar, anyOf, letter, exactly, wordBoundary, maybe, whitespace, digit } from "magic-regexp";
import { reservedWords1, reservedWords2, reservedWords3, reservedWords4, reservedWords5, suffixReservedWords } from "./reservedWords";

export const idSegmentPattern = oneOrMore(wordChar);
export const firstIdSegmentPattern = anyOf(letter, "_").and(wordChar.times.any());
export const lineStart = exactly("").at.lineStart();
export const lineEnd = exactly("").at.lineEnd();

// 定义 ID 的合法范围。
// 规则：一个或多个 id 段，用点号 "." 连接。整体不能等于任何 reservedWords；第一个 id 段不能以数字开头；当 id 段数量大于 1 时，最后一个 id 段不能为 suffixReservedWords 中的任何一个。
// 例如： a, a_b, a.b, a.b.c
export const idPattern = exactly(
    wordBoundary
        .notAfter(".")
        .notBefore(
            anyOf(
                anyOf(...reservedWords1),
                anyOf(...reservedWords2),
                anyOf(...reservedWords3),
                anyOf(...reservedWords4),
                anyOf(...reservedWords5),
            ),
            wordBoundary.notBefore(".")
        ),
    firstIdSegmentPattern,
    maybe(
        exactly(".")
            .and(idSegmentPattern).times.any(),
        exactly(".")
            .notBefore(
                anyOf(...suffixReservedWords),
                wordBoundary.or(lineEnd)
            )
            .and(idSegmentPattern),
    ),
    wordBoundary.notBefore(".")
);

// 大致界定 Expr DSL 中纯表达式 (expression) 内容的字符范围
export const expressionCharRange = [
    // wordChar, whitespace,
    "+", "-", "*", "/", "^", "%", "!",
    "(", ")", "[", "]", "{", "}",
    ".", ",", ":",
    "=", "<", ">",
] as const;
export const inExpressionCharRangePattern =
    anyOf(
        wordChar, whitespace,
        exactly("${", digit.times.any(), "}"),
        ...expressionCharRange,
    ).times.any();

export const paramNamePattern = exactly(
    wordBoundary
        .notAfter(".")
        .notBefore(
            anyOf(
                anyOf(...reservedWords1),
                anyOf(...reservedWords2),
                anyOf(...reservedWords3),
                anyOf(...reservedWords4),
                anyOf(...reservedWords5),
            ),
            wordBoundary.notBefore(".")
        ),
    firstIdSegmentPattern,
    wordBoundary.notBefore(".")
);

// ctxVar 名称——不用考虑与保留字冲突
// （只要是使用 CtxExp 工厂创建的。这时只可能通过插值代入方式使用该变量，而不是在 DSL 内容中直接引用符号。
// 如果是后者就需要考虑保留字冲突了。）
export const ctxVarNamePattern = exactly(
    wordBoundary.notAfter("."),
    firstIdSegmentPattern,
    wordBoundary.notBefore(".")
);