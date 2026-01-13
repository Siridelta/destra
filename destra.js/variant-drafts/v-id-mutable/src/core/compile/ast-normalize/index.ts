import { FormulaASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/formula";
import { Formula } from "../../formula/base";
import { getState } from "../../state";
import { CompileContext } from "../types";
import { ASTParenAdder } from "./add-parens";
import { ASTCloner } from "./clone";
import { ASTExpander } from "./expand";
import { MultDivArranger } from "./multDiv-arrange";

export class ASTNormalizer {
    public compileContext: CompileContext;
    public targetFormula: Formula;
    public requestDep: (formula: Formula) => FormulaASTNode;
    
    constructor(
        compileContext: CompileContext, 
        targetFormula: Formula,
        requestDep: (formula: Formula) => FormulaASTNode
    ) {
        this.compileContext = compileContext;
        this.targetFormula = targetFormula;
        this.requestDep = requestDep;
    }

    public normalizeAST(): FormulaASTNode {
        const ast = getState(this.targetFormula).ast!.root;
        const cloned = new ASTCloner().visit(ast);
        const expanded = new ASTExpander().visit(cloned);
        const rearranged = new MultDivArranger(this.compileContext, this.targetFormula).visit(expanded);
        const parened = new ASTParenAdder().visit(rearranged);
        return parened;
    }
}