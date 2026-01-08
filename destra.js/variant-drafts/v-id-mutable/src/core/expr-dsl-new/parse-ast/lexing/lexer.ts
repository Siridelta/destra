import { Lexer } from "chevrotain";
import { Whitespace, SingleLineComment, NumberLiteral, Placeholder, CustomIdentifier, ColorHexLiteral } from "../tokens/others";
import { keywords } from "../tokens/keywords";
import { opAndPuncs } from "../tokens/op-and-puncs";
import { reservedWords } from "../tokens/reserved-words";

export const tokensList = [

    Whitespace,
    SingleLineComment,

    ...keywords,
    
    NumberLiteral,
    ColorHexLiteral,

    ...opAndPuncs,

    Placeholder,

    ...reservedWords,
    
    CustomIdentifier,
]

export const lexer = new Lexer(tokensList);