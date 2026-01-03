import { createToken, Lexer } from "chevrotain";

// Implicit Multiply Token, to be inserted in post-lexing phase
export const IMult = createToken({
    name: "IMult",
    pattern: Lexer.NA
});