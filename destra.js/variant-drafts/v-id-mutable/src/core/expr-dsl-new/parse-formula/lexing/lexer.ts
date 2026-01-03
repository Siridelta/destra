import { Lexer } from "chevrotain";
import { Whitespace, SingleLineComment, NumberLiteral, Placeholder, Variable } from "../tokens/others";
import { keywords } from "../tokens/keywords";
import { opAndPuncs } from "../tokens/op-and-puncs";
import { IMult } from "../tokens/imult";

export const tokensList = [

    Whitespace,
    SingleLineComment,

    ...keywords,
    
    NumberLiteral,

    ...opAndPuncs,

    Placeholder,
    
    Variable,

    IMult
]

export const lexer = new Lexer(tokensList);