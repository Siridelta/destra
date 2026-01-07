import { lexer } from "../lexing/lexer";
import { formulaParser } from "../parsing/parser";
import { formulaVisitor } from "../sematics/visitor";


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

function parseAST(input: string) {
    const cst = parseCST(input);
    if (!cst) return;
    const ast = formulaVisitor.visit(cst);
    return ast;
}



const ast1 = parseAST("(1, [1...10][5...][[1...10] > e]).x!");
console.log('AST:', ast1);
console.log('end');