/**
 * 共用 (common) 的正则表达式定义
 */

import { oneOrMore, wordChar, anyOf, letter, exactly, wordBoundary, maybe, whitespace, digit } from "magic-regexp";
import { builtInFuncs1, builtInFuncs2, builtInFuncs3, builtInFuncs4, builtInFuncs5, builtInConsts, reservedVars } from "./reservedWords";

export const idSegmentPattern = oneOrMore(wordChar);
export const lineStart = exactly("").at.lineStart();
export const lineEnd = exactly("").at.lineEnd();

// 定义 ID 的合法范围。
// 规则：一个或多个 id 段，用点号 "." 连接。整体不能等于任何 reservedWords；第一个 id 段不能以数字开头；当 id 段数量大于 1 时，最后一个 id 段不能为 suffixReservedWords 中的任何一个。
// 例如： a, a_b, a.b, a.b.c
export const idPattern = exactly(
    lineStart,
    idSegmentPattern,
    maybe(
        exactly(
            ".", 
            idSegmentPattern,
        ).times.any()
    ),
    lineEnd,
);

// DSL 内部变量名 - 排除列表
export const internalVarNameExcludePattern = exactly(
    anyOf(
        anyOf(...reservedVars),
        anyOf(...builtInConsts),
        anyOf(...builtInFuncs1),
        anyOf(...builtInFuncs2),
        anyOf(...builtInFuncs3),
        anyOf(...builtInFuncs4),
        anyOf(...builtInFuncs5),
    ),
);

// ctx 变量名 - 排除列表
// 与 DSL 内部变量相比，可以覆盖保留变量
export const ctxVarNameExcludePattern = exactly(
    anyOf(
        anyOf(...builtInConsts),
        anyOf(...builtInFuncs1),
        anyOf(...builtInFuncs2),
        anyOf(...builtInFuncs3),
        anyOf(...builtInFuncs4),
        anyOf(...builtInFuncs5),
    ),
);

// 关键字
export const identifierPattern = exactly(
    anyOf(letter, "_"),
    wordChar.times.any(),
);