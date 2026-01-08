import { describe, it, expect } from "vitest";
import { lexer } from "../lexing/lexer";
import { formulaParser } from "../parsing/parser";
import { FormulaVisitor } from "../sematics/visitor";

function parse(input: string) {
    const lexResult = lexer.tokenize(input);
    if (lexResult.errors.length > 0) {
        throw new Error(`[Lexer Error] Input: "${input}"\nErrors: ${lexResult.errors.map(e => e.message).join(", ")}`);
    }
    
    formulaParser.input = lexResult.tokens;
    const cst = formulaParser.formula();
    if (formulaParser.errors.length > 0) {
        throw new Error(`[Parser Error] Input: "${input}"\nErrors: ${formulaParser.errors.map(e => e.message).join(", ")}`);
    }
    
    const visitor = new FormulaVisitor();
    const ast = visitor.visit(cst);
    return ast;
}

function getAstType(ast: any): string {
    const content = ast.content;
    if (content.type === "expression") {
        return content.content.type;
    } else if (content.type === "explicitEquation" && content.isOmitted) {
        // For "x - 3", it is an omitted explicit equation (y = x - 3)
        if (content.rhs) {
            return content.rhs.type;
        } else {
             throw new Error("Unexpected AST: explicitEquation without rhs: " + JSON.stringify(content, null, 2));
        }
    } else {
        return content.type;
    }
}

describe("Operator Precedence & Implicit Multiplication", () => {
    it("1. Explicit Multiplication with Negative Number", () => {
        const ast = parse("2 * -3");
        expect(getAstType(ast)).toBe("multiplication");
    });

    it("2. Subtraction", () => {
        expect(getAstType(parse("2 - 3"))).toBe("subtraction");
        expect(getAstType(parse("2 -3"))).toBe("subtraction");
    });

    it("3. Variable Subtraction (Dependent on 'x' -> Explicit Equation)", () => {
        expect(getAstType(parse("x - 3"))).toBe("subtraction");
    });

    it("4. Function Call + Subtraction", () => {
        expect(getAstType(parse("sin(x) - 3"))).toBe("subtraction");
    });

    it("5. Implicit Multiplication", () => {
        expect(getAstType(parse("2(x+1)"))).toBe("implicitMult");
        expect(getAstType(parse("(x+1)(x-1)"))).toBe("implicitMult");
        expect(getAstType(parse("2 x"))).toBe("implicitMult");
    });

    it("6. Complex Chain", () => {
        expect(getAstType(parse("2 * -3 + 5"))).toBe("addition");
    });

    it("7. Implicit Mult vs Subtraction check", () => {
        expect(getAstType(parse("x - 1"))).toBe("subtraction");
    });

    it("8. Number Implicit Mult (Allowed)", () => {
        expect(getAstType(parse("2(-y)"))).toBe("implicitMult");
    });

    // it("9. Defined Function Call Check", () => {
    //     expect(() => parse("sin(x)")).toThrowError();
});
