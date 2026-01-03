import { lexer } from "../lexing/lexer";
import { formulaParser } from "../parsing/parser";


function parseCST(input: string) {
    const lexResult = lexer.tokenize(input);
    if (lexResult.errors.length > 0) {
        console.error("Lexing errors:", lexResult.errors);
        return;
    }
    formulaParser.input = lexResult.tokens;
    const cst = formulaParser.formula();
    if (formulaParser.errors.length > 0) {
        console.error("Parsing errors:", formulaParser.errors);
        return;
    }
    return cst;
}

parseCST("f(x) = x^2");