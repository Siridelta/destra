import { lexer } from "../lexing/lexer";
import { formulaParser, FormulaParser } from "../parsing/parser";
import { FormulaVisitor } from "../sematics/visitor";

const input = `
    (
       1, 
       [1...10][5...][[1...10] > e]
    ).x!
    in
        ln 30
        : random([1...10])
`;

function test(iterations: number) {
    let lexTime = 0;
    let parseTime = 0;
    let visitTime = 0;
    for (let i = 0; i < iterations; i++) {
        // Lexing
        const lexStart = performance.now();
        const lexResult = lexer.tokenize(input);
        lexTime += performance.now() - lexStart;
        if (lexResult.errors.length > 0) throw new Error("Lexer errors");
        
        // Parsing
        const parseStart = performance.now();
        formulaParser.input = lexResult.tokens;
        const cst = formulaParser.formula();
        parseTime += performance.now() - parseStart;
        if (formulaParser.errors.length > 0) throw new Error("Parser errors");
        
        // Visiting
        const visitStart = performance.now();
        const visitor = new FormulaVisitor();
        const ast = visitor.visit(cst);
        visitTime += performance.now() - visitStart;
    }
    return { lexTime, parseTime, visitTime };
}

const ITERATIONS = 100;

console.log("Warming up...");
test(10);

console.log(`\nRunning benchmark with ${ITERATIONS} iterations...`);

const result = test(ITERATIONS);
console.log(`Lexing: ${(result.lexTime/ITERATIONS).toFixed(4)} ms/op (Total: ${result.lexTime.toFixed(2)}ms)`);
console.log(`Parsing: ${(result.parseTime/ITERATIONS).toFixed(4)} ms/op (Total: ${result.parseTime.toFixed(2)}ms)`);
console.log(`Visiting: ${(result.visitTime/ITERATIONS).toFixed(4)} ms/op (Total: ${result.visitTime.toFixed(2)}ms)`);
