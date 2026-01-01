import { createToken, TokenType } from "chevrotain";
import { NumberLiteral } from "./tokens/others";

export const implicitMultiplyToken = createToken({
    name: "ImplicitMultiply",
});

export const postLex = (tokens: TokenType[]): TokenType[] => {
    
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const tokenNext = i < tokens.length ? tokens[i + 1] : null;

        if (!tokenNext) continue;

        // Exclusive Rule: Not between number literals
        if (token.name === NumberLiteral.name && tokenNext.name === NumberLiteral.name) {
            continue;
        }

        let leftCandidate = false;
        let rightCandidate = false;

        // --- left candidate ---


    }

    return tokens;
};