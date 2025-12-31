import { createToken, Lexer } from "chevrotain";
import { createRegExp, digit, oneOrMore, letter, char, exactly, maybe, anyOf } from "magic-regexp";

// --- Literals ---

const NumberLiteral = createToken({
    name: "NumberLiteral",
    // Match integers or decimals: 123, 123.456
    pattern: createRegExp(oneOrMore(digit), maybe(exactly('.').and(oneOrMore(digit)))),
});

const StringLiteral = createToken({
    name: "StringLiteral",
    // Simple string matching single or double quotes
    pattern: /'[^']*'|"[^"]*"/, 
});

const Identifier = createToken({
    name: "Identifier",
    // Starts with letter or _, followed by letters, numbers, or _
    pattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
});

const Whitespace = createToken({
    name: "Whitespace",
    pattern: /\s+/,
    group: Lexer.SKIPPED,
});

// --- Operators & Symbols ---

const RangeDots = createToken({
    name: "RangeDots",
    pattern: "...",
});

const Plus = createToken({
    name: "Plus",
    pattern: "+",
});
const Minus = createToken({
    name: "Minus",
    pattern: "-",
});
const Multiply = createToken({
    name: "Multiply",
    pattern: "*",
});
const Divide = createToken({
    name: "Divide",
    pattern: "/",
});
const Power = createToken({
    name: "Power",
    pattern: "^",
});
const Comma = createToken({
    name: "Comma",
    pattern: ",",
});

// --- Brackets ---

const ParenthesisOpen = createToken({
    name: "ParenthesisOpen",
    pattern: "(",
});
const ParenthesisClose = createToken({
    name: "ParenthesisClose",
    pattern: ")",
});
const BracketOpen = createToken({
    name: "BracketOpen",
    pattern: "[",
});
const BracketClose = createToken({
    name: "BracketClose",
    pattern: "]",
});

// Important: Order matters!
// - Longer patterns (like "...") should come before shorter ones if they overlap (though "..." and "." don't overlap here yet)
// - Keywords (if any) should come before Identifiers
const tokensList = [
    Whitespace, // Skipped
    
    // Complex literals
    NumberLiteral,
    StringLiteral,
    
    // Symbols
    RangeDots, // ...
    Plus,
    Minus,
    Multiply,
    Divide,
    Power,
    Comma,
    
    // Brackets
    ParenthesisOpen,
    ParenthesisClose,
    BracketOpen,
    BracketClose,
    
    // Identifier (lowest priority among text-like tokens)
    Identifier,
];

const lexer = new Lexer(tokensList);

export {
    lexer,
    tokensList,
    // Export tokens for the parser
    NumberLiteral,
    StringLiteral,
    Identifier,
    RangeDots,
    Plus,
    Minus,
    Multiply,
    Divide,
    Power,
    Comma,
    ParenthesisOpen,
    ParenthesisClose,
    BracketOpen,
    BracketClose,
};
