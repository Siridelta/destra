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

// 1. Reuse All (Simulation: Reuse single visitor instance)
function testReuseAll(iterations: number) {
    const start = performance.now();
    const visitor = new FormulaVisitor(); // Reuse this
    for (let i = 0; i < iterations; i++) {
        const lexResult = lexer.tokenize(input);
        if (lexResult.errors.length > 0) throw new Error("Lexer errors");
        
        formulaParser.input = lexResult.tokens;
        const cst = formulaParser.formula();
        if (formulaParser.errors.length > 0) throw new Error("Parser errors");
        
        const ast = visitor.visit(cst);
    }
    return performance.now() - start;
}

// 2. Reuse Parser, New Visitor
function testReuseParserNewVisitor(iterations: number) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        const lexResult = lexer.tokenize(input);
        if (lexResult.errors.length > 0) throw new Error("Lexer errors");
        
        formulaParser.input = lexResult.tokens;
        const cst = formulaParser.formula();
        if (formulaParser.errors.length > 0) throw new Error("Parser errors");
        
        const visitor = new FormulaVisitor();
        const ast = visitor.visit(cst);
    }
    return performance.now() - start;
}

// 3. New Parser, New Visitor (Simulate full reconstruction)
function testNewParserNewVisitor(iterations: number) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        const lexResult = lexer.tokenize(input);
        if (lexResult.errors.length > 0) throw new Error("Lexer errors");
        
        const localParser = new FormulaParser(); // New Parser every time
        localParser.input = lexResult.tokens;
        const cst = localParser.formula();
        if (localParser.errors.length > 0) throw new Error("Parser errors");
        
        const visitor = new FormulaVisitor();
        const ast = visitor.visit(cst);
    }
    return performance.now() - start;
}

const ITERATIONS = 100;

console.log("Warming up...");
testReuseAll(10);
testNewParserNewVisitor(10);

console.log(`\nRunning benchmark with ${ITERATIONS} iterations...`);

const timeA = testReuseAll(ITERATIONS);
console.log(`方案 A (全复用): ${(timeA/ITERATIONS).toFixed(4)} ms/op (Total: ${timeA.toFixed(2)}ms)`);

const timeB = testReuseParserNewVisitor(ITERATIONS);
console.log(`方案 B (复用Parser, 新Visitor): ${(timeB/ITERATIONS).toFixed(4)} ms/op (Total: ${timeB.toFixed(2)}ms)`);

const timeC = testNewParserNewVisitor(ITERATIONS);
console.log(`方案 C (全重建): ${(timeC/ITERATIONS).toFixed(4)} ms/op (Total: ${timeC.toFixed(2)}ms)`);

console.log(`\nRatio C / B: ${(timeC/timeB).toFixed(2)}x`);
