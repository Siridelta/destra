import { createToken, Lexer } from "chevrotain";
import { anyOf, charIn, charNotIn, createRegExp, digit, exactly, maybe, oneOrMore, whitespace } from "magic-regexp";
import { identifierPattern } from "../../syntax-reference/commonRegExpPatterns";

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

// 需要注意与 Rangedots 的冲突
// 1...3 应该解析成 1, ..., 3, 不能让 NumberLiteral 解析掉第一个点（'1.'，一种带小数点、省略小数部分的情形）
// 所以：
// 整数后面跟的小数点，不能再跟2个点号（否则会干扰 RangeDots 的解析）；
// 除非这2个点号后面还有1个点（如1....3）。这时可以安全并且应当把第一个点作为小数点解析掉。

// Modify: Removed leading optional sign to avoid ambiguity with subtraction.
// "2 -3" should be parsed as "2" - "3", not "2" * "-3".
// Negative numbers will be parsed as UnaryMinus + Number.
export const NumberLiteral = createToken({
    name: "NumberLiteral",
    pattern: createRegExp(
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
                    anyOf(
                        // 只有小数点，需要做后续点号的检测
                        exactly(".")
                            .notBefore(
                                exactly("..").notBefore("."),
                            ),
                        // 小数点后面有数字，正常解析
                        exactly(
                            ".",
                            digit.times.atLeast(1),
                        ),
                    )
                )
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


// --- Custom Identifier ---

// Let it be the last token in the token list to exclude reserved words,
// and directly use identifierPattern.

// Includes 2 cases:
// - DSL internal variable (most cases)
// - the desired ID in one of the function definition syntaxes: 
//   - expl`myFunc(x) = x^2` --> 'myFunc' is used to specify the resulting FuncExpl's ID.
export const CustomIdentifier = createToken({
    name: "CustomIdentifier",
    pattern: createRegExp(identifierPattern),
});
