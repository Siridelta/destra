import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as ohm from 'ohm-js';

// --- Utils to read grammar file ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const grammarSource = fs.readFileSync(path.join(__dirname, 'grammar.ohm'), 'utf-8');
const grammar = ohm.grammar(grammarSource);

// --- AST Node Definitions (Simplified) ---
// Using a simple object structure similar to what we might use in Destra
type ASTNode = 
    | { type: 'BinaryOp', operator: string, left: ASTNode, right: ASTNode }
    | { type: 'FunctionCall', callee: string, args: ASTNode[] }
    | { type: 'List', elements: ASTNode[] }
    | { type: 'Range', start: ASTNode, end: ASTNode }
    | { type: 'Identifier', value: string }
    | { type: 'Number', value: number }
    | { type: 'String', value: string };

// --- Semantics: CST -> AST ---
const semantics = grammar.createSemantics();

semantics.addOperation<ASTNode>('toAST', {
    Exp(e) {
        return e.toAST();
    },

    AddExp_add(left, op, right) {
        return {
            type: 'BinaryOp',
            operator: op.sourceString,
            left: left.toAST(),
            right: right.toAST(),
        };
    },
    AddExp_sub(left, op, right) {
        return {
            type: 'BinaryOp',
            operator: op.sourceString,
            left: left.toAST(),
            right: right.toAST(),
        };
    },

    MulExp_mul(left, op, right) {
        return {
            type: 'BinaryOp',
            operator: op.sourceString,
            left: left.toAST(),
            right: right.toAST(),
        };
    },
    MulExp_div(left, op, right) {
        return {
            type: 'BinaryOp',
            operator: op.sourceString,
            left: left.toAST(),
            right: right.toAST(),
        };
    },

    ExpExp_power(left, op, right) {
        return {
            type: 'BinaryOp',
            operator: op.sourceString,
            left: left.toAST(),
            right: right.toAST(),
        };
    },

    PriExp_paren(_open, exp, _close) {
        return exp.toAST();
    },

    CallExp(id, _open, args, _close) {
        return {
            type: 'FunctionCall',
            callee: id.sourceString,
            args: args.asIteration().toAST(),
        };
    },

    ListExp(_open, elements, _close) {
        return {
            type: 'List',
            elements: elements.asIteration().toAST(),
        };
    },

    RangeExp(_open, start, _dots, end, _close) {
        return {
            type: 'Range',
            start: start.toAST(),
            end: end.toAST(),
        };
    },

    identifier(_first, _rest) {
        return { type: 'Identifier', value: this.sourceString };
    },

    number(_digits, _dot, _decimals) {
        return { type: 'Number', value: parseFloat(this.sourceString) };
    },

    stringLiteral(_open, chars, _close) {
        return { type: 'String', value: chars.sourceString };
    },
    
    // Helper for ListOf
    NonemptyListOf(first, _sep, rest) {
        return [first.toAST(), ...rest.toAST()];
    },
    EmptyListOf() {
        return [];
    },
    
    // Ohm v16+ requires explicit _iter/_terminal for generic operations
    _iter(...children) {
        return children.map(c => c.toAST());
    },
    _terminal() {
        return this.sourceString;
    }
});

// --- Test Runner ---
function parse(input: string) {
    console.log(`\n--- Parsing: "${input}" ---`);
    
    const match = grammar.match(input);
    if (match.failed()) {
        console.error("Parse Error:");
        console.error(match.message);
        return;
    }

    const ast = semantics(match).toAST();
    console.log("AST:", JSON.stringify(ast, null, 2));
    return ast;
}

// --- Test Cases ---
// parse("1 + 2 * 3");
// parse("1 + 2 * 3 + 3 * 4 + 4");
// parse("f(x, 10)");
// parse("[1, 2, 3]");
// parse("[1...10]");
// parse("sin(x)^2 + cos(x)^2");
// parse("'hello world'");
// // Test precedence: (1+2)*3 vs 1+2*3
// parse("(1 + 2) * 3");
// parse("1 + 2 * 3");
// // Test Range vs List conflict resolution
// parse("[1, 2]");
// parse("[1...10]");
parse("ffffff");
