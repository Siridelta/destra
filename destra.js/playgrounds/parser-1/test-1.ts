import { lexer } from "./lexer";
import { parser } from "./parser";
import { visitor } from "./visitor";

function parse(input: string) {
    console.log(`\n--- Parsing: "${input}" ---`);
    
    // 1. Lexing
    const lexResult = lexer.tokenize(input);
    if (lexResult.errors.length > 0) {
        console.error("Lexing errors:", lexResult.errors);
        return;
    }

    // 2. Parsing
    parser.input = lexResult.tokens;
    const cst = parser.expression();

    if (parser.errors.length > 0) {
        console.error("Parsing errors:", parser.errors);
        return;
    }

    // 3. Visiting (CST -> AST)
    const ast = visitor.visit(cst);
    console.log("AST:", JSON.stringify(ast, null, 2));
    return ast;
}

// Test Cases
parse("1 + 2 * 3");
parse("f(x, 10)");
parse("[1, 2, 3]");
parse("[1...10]");
parse("sin(x)^2 + cos(x)^2");
parse("'hello world'");
