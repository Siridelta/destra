import { createRegExp, exactly, maybe } from "magic-regexp";
import { anyOf } from "magic-regexp";
import { digit } from "magic-regexp";



const numberRegex = createRegExp(
    // 可选正负号
    maybe(anyOf("-", "+").groupedAs("sign")),
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
console.log('1'.match(numberRegex));