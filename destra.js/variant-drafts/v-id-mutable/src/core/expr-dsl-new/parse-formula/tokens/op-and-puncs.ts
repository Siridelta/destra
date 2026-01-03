import { createToken, Lexer } from "chevrotain";
import { createRegExp } from "magic-regexp";

// --- Operator & Punctuation ---

//     --- categories ---

export const ComparisonOperator = createToken({
    name: "ComparisonOperator",
    pattern: Lexer.NA,
});

//     --- length = 3 ---

export const RangeDots = createToken({
    name: "...",
    pattern: createRegExp("..."),
});

//     --- length = 2 ---

export const GreaterEqual = createToken({
    name: ">=",
    pattern: createRegExp(">="),
    categories: [ComparisonOperator],
});

export const LessEqual = createToken({
    name: "<=",
    pattern: createRegExp("<="),
    categories: [ComparisonOperator],
});

export const Equal2 = createToken({
    name: "==",
    pattern: createRegExp("=="),
    categories: [ComparisonOperator],
});

export const Action = createToken({
    name: "->",
    pattern: createRegExp("->"),
});

export const ArrowFunc = createToken({
    name: "=>",
    pattern: createRegExp("=>"),
});

export const PercentOf = createToken({
    name: "%of",
    pattern: createRegExp("%of"),
});

//     --- length = 1 ---

export const Comma = createToken({
    name: ",",
    pattern: createRegExp(","),
});

export const Colon = createToken({
    name: ":",
    pattern: createRegExp(":"),
});

export const Dot = createToken({
    name: ".",
    pattern: createRegExp("."),
});

export const Greater = createToken({
    name: ">",
    pattern: createRegExp(">"),
    categories: [ComparisonOperator],
});

export const Less = createToken({
    name: "<",
    pattern: createRegExp("<"),
    categories: [ComparisonOperator],
});

export const Equal = createToken({
    name: "=",
    pattern: createRegExp("="),
    categories: [ComparisonOperator],
});

export const Tilde = createToken({
    name: "~",
    pattern: createRegExp("~"),
});

export const Plus = createToken({
    name: "+",
    pattern: createRegExp("+"),
});

export const Minus = createToken({
    name: "-",
    pattern: createRegExp("-"),
});

export const Multiply = createToken({
    name: "*",
    pattern: createRegExp("*"),
});

export const Divide = createToken({
    name: "/",
    pattern: createRegExp("/"),
});

export const Percent = createToken({
    name: "%",
    pattern: createRegExp("%"),
});

export const Power = createToken({
    name: "^",
    pattern: createRegExp("^"),
});

export const Bang = createToken({
    name: "!",
    pattern: createRegExp("!"),
});

// --- Brackets ---

export const ParenthesisOpen = createToken({
    name: "(",
    pattern: createRegExp("("),
});

export const ParenthesisClose = createToken({
    name: ")",
    pattern: createRegExp(")"),
});

export const BracketOpen = createToken({
    name: "[",
    pattern: createRegExp("["),
});

export const BracketClose = createToken({
    name: "]",
    pattern: createRegExp("]"),
});

export const BraceOpen = createToken({
    name: "{",
    pattern: createRegExp("{"),
});

export const BraceClose = createToken({
    name: "}",
    pattern: createRegExp("}"),
});

export const opAndPuncs = [
    RangeDots,
    GreaterEqual,
    LessEqual,
    Equal2,
    Action,
    ArrowFunc,
    PercentOf,
    Comma,
    Colon,
    Dot,
    Greater,
    Less,
    Equal,
    Tilde,
    Plus,
    Minus,
    Multiply,
    Divide,
    Percent,
    Power,
    Bang,
    ParenthesisOpen,
    ParenthesisClose,
    BracketOpen,
    BracketClose,
    BraceOpen,
    BraceClose,
];