import { createToken, Lexer } from "chevrotain";
import { anyOf, charIn, charNotIn, createRegExp, digit, exactly, maybe, oneOrMore, whitespace } from "magic-regexp";
import { identifierPattern } from "../../syntax/commonRegExpPatterns";

export const Whitespace = createToken({
    name: "Whitespace",
    pattern: createRegExp(whitespace.times.atLeast(1)),
    group: Lexer.SKIPPED,
});

export const SingleLineComment = createToken({
    name: "SingleLineComment",
    pattern: createRegExp(
        "//",
        oneOrMore(charNotIn("\n\r"))
    ),
    group: Lexer.SKIPPED
});

// --- Number Literal ---

export const NumberLiteral = createToken({
    name: "NumberLiteral",
    pattern: createRegExp(
        // 可选正负号
        maybe(anyOf("-", "+")),
        // 数值 / 科学计数法底数
        anyOf(
            // 必带整数部分，可选小数部分，123.456, 123., ...
            exactly(
                anyOf(
                    "0",
                    exactly(
                        charIn("123456789"),
                        digit.times.any(),
                    ),
                ),
                maybe(
                    ".",
                    digit.times.any(),
                ),
            ),
            // 无整数部分，必带小数部分，.456, .4567, ...
            exactly(
                ".",
                digit.times.atLeast(1),
            ),
        ),
        // 可选科学计数法后续部分
        maybe(
            anyOf("e", "E"),
            maybe(anyOf("-", "+")),
            digit.times.atLeast(1),   // 指数部分对 0 开头无要求
        ),
    ),
});



// --- Placeholder ---

export const Placeholder = createToken({
    name: "Placeholder",
    pattern: createRegExp(
        "$",
        digit.times.atLeast(1),
        "$",
    ),
});


// --- InternalVariable ---

// Let Variable be the last token, so to exclude reserved words,
// and directly use identifierPattern.
export const Variable = createToken({
    name: "Variable",
    pattern: createRegExp(identifierPattern),
});