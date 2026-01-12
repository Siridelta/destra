import { ASTVisitor } from "../../expr-dsl/visit-ast/visitor";
import { Formula } from "../../formula/base";
import { CompileContext } from "../types";
import { LatexCompiler } from ".";
import { FormulaASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/formula";

declare module '.' {
    interface LatexCompiler {
        formula(node: FormulaASTNode): string;
        
        
    }
}